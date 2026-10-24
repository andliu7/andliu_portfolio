'use client';
import { useEffect, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { useFinePointer } from '@/components/site/use-fine-pointer';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// The hero's client pieces (hero.tsx HeroPanel; Andrew 2026-10-21 picked the photo layout on
// /draft). /draft shows a second panel (icons D, kept in case he changes his mind), so HeroFx
// does its jobs for every .hp-panel on the page: it fits the name, and it runs the one roll and
// the LIU to 刘 flip with hero.css's own attributes (data-roll, data-zh).
//
// It renders nothing: a client component used only for its effect (useEffect runs in the
// browser after the server HTML is on screen).

const ROLL_AFTER = 4500; // the one roll, 4.5s after the panel is first seen

// The fit: the whole name on one line at every width. A stage 760px and wider fills the card's
// inside; a phone fills 92% of the page (2026-10-23, Andrew: "the image is the central point
// with my name horizontally going through, slightly less large than the width of the page";
// until then ANDREW alone filled the card, LIU on a second line). It runs again once the web
// fonts are in, and on resize.
function fitAll() {
  document.querySelectorAll<HTMLElement>('.hp-panel').forEach(panel => {
    const stage = panel.querySelector<HTMLElement>('.hp-stage');
    const wrap = panel.querySelector<HTMLElement>('.hero-namewrap');
    const name = panel.querySelector<HTMLElement>('.hp-name');
    const back = panel.querySelector<HTMLElement>('.hp-back');
    if (!stage || !wrap || !name || !back) return;
    const current = parseFloat(getComputedStyle(name).fontSize);
    const wide = stage.clientWidth >= 760;
    name.style.width = 'max-content';
    const natural = name.getBoundingClientRect().width;
    name.style.width = '';
    if (!current || !natural) return;
    // Wide: 86% of the card (80% until Andrew 2026-10-21 asked for it slightly larger), so the
    // objects still have room round the name (icons D sit at its corners). A phone: 92% of
    // innerWidth, the same width 100vw is in hero-photo.css's fallback, so nothing jumps.
    const size = (current * (wide ? wrap.clientWidth * 0.86 : window.innerWidth * 0.92)) / natural;
    stage.style.setProperty('--fs-js', `${Math.max(40, Math.floor(size * 0.98))}px`);
    // Where ANDREW now starts inside the card, so "Hi, my name is" lines up with it whichever
    // limit (the width or the screen's height) sized the name (hero-photo.css .hp-hi). Read on the
    // next frame, after the new size has laid out.
    const card = panel.querySelector<HTMLElement>('.hero-card');
    if (card) requestAnimationFrame(() => {
      stage.style.setProperty('--hp-name-left', `${Math.round(back.getBoundingClientRect().left - card.getBoundingClientRect().left)}px`);
    });
  });
}

export function HeroFx() {
  useEffect(() => {
    const d = document.documentElement;
    let alive = true;
    let pending = 0;
    // One fit per frame, however many of the triggers below fire
    const fit = () => {
      if (!alive) return;
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(fitAll);
    };
    // (2026-10-23: WebKit, so Safari and Chrome on an iPhone, can leave document.fonts.ready
    // pending for good with document.fonts.status already 'loaded', so the fit never ran there.
    // Now it also runs when the fonts are already in, and when a font load finishes.)
    const refit = () => {
      if (document.fonts.status === 'loaded') fit();
      document.fonts.ready.then(fit);
    };
    refit();
    document.fonts.addEventListener('loadingdone', fit);
    window.addEventListener('resize', refit);

    // The roll: once per name, 4.5s after it first comes on screen once the loader has lifted
    const timers: number[] = [];
    const seen = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        seen.unobserve(entry.target);
        const name = entry.target.querySelector<HTMLElement>('.hp-name');
        const wait = () => {
          if (!d.classList.contains('is-loaded')) { timers.push(window.setTimeout(wait, 500)); return; }
          timers.push(window.setTimeout(() => {
            if (d.getAttribute('data-motion') !== 'reduced') name?.setAttribute('data-roll', '');
          }, ROLL_AFTER));
        };
        wait();
      });
    }, { threshold: 0.4 });
    const panels = document.querySelectorAll<HTMLElement>('.hp-panel');
    panels.forEach(panel => seen.observe(panel));

    // LIU to 刘 under the pointer, or for 1.6s after a tap
    const offs: (() => void)[] = [];
    panels.forEach(panel => {
      const name = panel.querySelector<HTMLElement>('.hp-name');
      const liu = panel.querySelector<HTMLElement>('.hero-liu');
      if (!name || !liu) return;
      let back = 0;
      const enter = (e: PointerEvent) => { if (e.pointerType !== 'touch') name.setAttribute('data-zh', ''); };
      const leave = (e: PointerEvent) => { if (e.pointerType !== 'touch') name.removeAttribute('data-zh'); };
      const tap = (e: PointerEvent) => {
        if (e.pointerType !== 'touch') return;
        name.setAttribute('data-zh', '');
        window.clearTimeout(back);
        back = window.setTimeout(() => name.removeAttribute('data-zh'), 1600);
      };
      liu.addEventListener('pointerenter', enter);
      liu.addEventListener('pointerleave', leave);
      liu.addEventListener('pointerdown', tap);
      offs.push(() => {
        liu.removeEventListener('pointerenter', enter);
        liu.removeEventListener('pointerleave', leave);
        liu.removeEventListener('pointerdown', tap);
        window.clearTimeout(back);
      });
    });

    return () => {
      alive = false;
      cancelAnimationFrame(pending);
      window.removeEventListener('resize', refit);
      document.fonts.removeEventListener('loadingdone', fit);
      seen.disconnect();
      timers.forEach(t => window.clearTimeout(t));
      offs.forEach(off => off());
    };
  }, []);
  return null;
}

// The drift (Andrew 2026-10-21 kept it in his pick): a layer that drifts a few px with the
// pointer anywhere on the page. depth is the most it moves, in px at the screen's edge; a negative depth moves against the pointer, so
// the layers part like depth. Mouse or trackpad only, and still under reduced motion.
// Pattern: useMotionValue holds the target outside React state (no re-render per mousemove);
// useSpring follows it with a spring, and motion.span reads the spring straight into transform.
export function Follow({ depth, className, children }: { depth: number; className: string; children: ReactNode }) {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const x = useSpring(tx, { stiffness: 120, damping: 20, mass: 0.6 });
  const y = useSpring(ty, { stiffness: 120, damping: 20, mass: 0.6 });
  const on = fine && !reduced;
  useEffect(() => {
    if (!on) { tx.set(0); ty.set(0); return; }
    const move = (e: PointerEvent) => {
      tx.set(((e.clientX / window.innerWidth) * 2 - 1) * depth);
      ty.set(((e.clientY / window.innerHeight) * 2 - 1) * depth * 0.6);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [on, depth, tx, ty]);
  return <motion.span className={className} style={{ x, y }}>{children}</motion.span>;
}
