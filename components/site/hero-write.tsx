'use client';
import { useEffect, useRef } from 'react';
import GLYPHS from './hero-glyphs.json';
import { Pencil } from './hero-objects/hero-objects';

// The pencil writes the name, once, as the page first appears (Andrew 2026-10-17: "a similar
// thing as the blueberry loading page where it draws out my name but using the pencil"). The same
// trick as Blueberry's wordmark: each letter is Fira Code's own outline (hero-glyphs.json, cut by
// scripts/hero-glyphs.py), so its stroke can be drawn on with stroke-dashoffset, then filled.
//
// How it runs:
//  - Only when the loader is still covering the hero when React mounts this (the first visit in a
//    tab), and never under reduced motion. Otherwise the name just appears as before.
//  - data-write on the h1 hides the real letters (hero.css); data-writing on the hero hides the
//    hero's own pencil (hero-objects.css) while this one does its job.
//  - Once the loader lifts and the letters' entrance has settled, each letter gets an SVG of its
//    outline laid exactly over its own box (measured, so spacing and size always match), drawn
//    in the letter's own colour. The pencil's tip rides the stroke as it is drawn
//    (getPointAtLength each frame), the outline fills, and the real letter takes over.
//  - Then the pencil glides to its resting place by ANDREW's last letter and hands over to the
//    hero's pencil, which is already there.
//  - Anything that interrupts it (the tab hidden, a resize, 8s passing) finishes it at once:
//    every letter shown, the pencil back in place. The name can never stay hidden.
// The animation is written straight to the DOM (styles and Web Animations), so React never
// re-renders while it plays.

const DRAW_MS = 190; // one letter's outline
const FILL_MS = 150; // its ink filling in, overlapping the next letter's outline
const START_MS = 1100; // after html.is-loaded: the pan has cleared and the letters have settled
const GLIDE_MS = 650;
const TIP = { x: 20 / 40, y: 93 / 96 }; // the pencil's point, as a fraction of its art (Pencil's viewBox)
const SVG = 'http://www.w3.org/2000/svg';

type Glyph = { adv: number; d: string };
const glyphs = GLYPHS.glyphs as Record<string, Glyph>;

export function HeroWrite() {
  const layerRef = useRef<HTMLDivElement>(null);
  const penRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = document.documentElement;
    const layer = layerRef.current, pen = penRef.current;
    const hero = document.getElementById('top');
    const name = document.getElementById('hero-title');
    if (!layer || !pen || !hero || !name) return;
    if (d.classList.contains('is-loaded') || d.getAttribute('data-motion') === 'reduced') return;

    name.setAttribute('data-write', '');
    hero.setAttribute('data-writing', '');
    let raf = 0, done = false;
    const timers: number[] = [];
    const letters = [...name.querySelectorAll<HTMLElement>('.hero-c')];

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      timers.forEach(window.clearTimeout);
      name.removeAttribute('data-write');
      letters.forEach(l => l.removeAttribute('data-on'));
      hero.removeAttribute('data-writing');
      layer.replaceChildren();
      pen.style.display = 'none';
      watch.disconnect();
      window.removeEventListener('resize', finish);
      document.removeEventListener('visibilitychange', onHidden);
    };
    const onHidden = () => { if (document.visibilityState === 'hidden') finish(); };
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };

    const write = () => {
      const fs = parseFloat(getComputedStyle(name).fontSize);
      const k = fs / GLYPHS.upm; // font units to px
      const box = layer.getBoundingClientRect();
      const art = hero.querySelector<HTMLElement>('.hob-pencil .hob-art');
      const angle = parseFloat(getComputedStyle(hero.querySelector('.hob-pencil')!).getPropertyValue('--r')) || 30;
      // The writing pencil is the hero pencil's size, held at the hero pencil's angle
      const pw = art?.offsetWidth || 60, ph = art?.offsetHeight || 140;
      Object.assign(pen.style, { display: 'block', width: `${pw}px`, height: `${ph}px`, transformOrigin: `${TIP.x * 100}% ${TIP.y * 100}%` });
      const place = (x: number, y: number) => { pen.style.transform = `translate(${x - pw * TIP.x}px, ${y - ph * TIP.y}px) rotate(${angle}deg)`; };

      // One SVG per letter, over the letter's own box, in its own colour
      const parts = letters.map(letter => {
        const ch = letter.querySelector('.hero-fa')?.textContent ?? '';
        const g = glyphs[ch];
        const r = letter.getBoundingClientRect();
        const svg = document.createElementNS(SVG, 'svg');
        const path = document.createElementNS(SVG, 'path');
        if (!g) return null;
        const left = r.left - box.left, top = r.top - box.top;
        svg.setAttribute('viewBox', `0 0 ${g.adv} ${GLYPHS.line}`);
        Object.assign(svg.style, { left: `${left}px`, top: `${top}px`, width: `${g.adv * k}px`, height: `${GLYPHS.line * k}px` });
        const colour = getComputedStyle(letter.querySelector('.hero-fa')!).color;
        path.setAttribute('d', g.d);
        Object.assign(path.style, { stroke: colour, fill: colour, fillOpacity: '0' });
        svg.appendChild(path);
        layer.appendChild(svg);
        const len = path.getTotalLength();
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;
        return { letter, path, len, left, top };
      });

      // Draw them one after another; the pencil follows the stroke being drawn
      const t0 = performance.now();
      const frame = (now: number) => {
        const t = now - t0;
        const i = Math.min(parts.length - 1, Math.floor(t / DRAW_MS));
        const p = parts[i];
        if (p) {
          const f = Math.min(1, (t - i * DRAW_MS) / DRAW_MS);
          p.path.style.strokeDashoffset = `${p.len * (1 - f)}`;
          const pt = p.path.getPointAtLength(p.len * f);
          place(p.left + pt.x * k, p.top + pt.y * k);
        }
        if (t < parts.length * DRAW_MS) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      parts.forEach((p, i) => {
        if (!p) return;
        later(() => {
          p.path.style.strokeDashoffset = '0';
          p.path.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: FILL_MS, fill: 'forwards' });
        }, (i + 1) * DRAW_MS);
        // the real letter takes over once its ink is in
        later(() => { p.letter.setAttribute('data-on', ''); p.path.parentElement?.remove(); }, (i + 1) * DRAW_MS + FILL_MS);
      });

      // Then the glide home: the pencil's centre onto the hero pencil's centre, at the same angle
      later(() => {
        if (!art) return finish();
        const hob = art.closest('.hob')!.getBoundingClientRect();
        const cx = hob.left + hob.width / 2 - box.left, cy = hob.top + hob.height / 2 - box.top;
        // the tip sits (0, ph * (TIP.y - .5)) below the centre before the turn; turn that offset too
        const a = angle * Math.PI / 180, dy = ph * (TIP.y - .5);
        const tipX = cx - Math.sin(a) * dy, tipY = cy + Math.cos(a) * dy;
        const from = pen.style.transform;
        place(tipX, tipY);
        const to = pen.style.transform;
        pen.animate([{ transform: from }, { transform: to }], { duration: GLIDE_MS, easing: 'cubic-bezier(.3,.7,.2,1)' }).finished.then(finish, finish);
      }, parts.length * DRAW_MS + FILL_MS);
    };

    // Wait for the loader to lift, then for the letters' entrance to settle
    const watch = new MutationObserver(() => {
      if (!d.classList.contains('is-loaded')) return;
      watch.disconnect();
      later(write, START_MS);
      later(finish, 8000);
    });
    watch.observe(d, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', finish);
    document.addEventListener('visibilitychange', onHidden);
    return finish;
  }, []);

  return (
    <div className="hero-write" aria-hidden="true">
      <div className="hero-write-letters" ref={layerRef} />
      <div className="hero-write-pen" ref={penRef}><Pencil /></div>
    </div>
  );
}

export default HeroWrite;
