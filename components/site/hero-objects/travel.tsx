'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HeroObjects } from './hero-objects';

// The four hero objects' trip down the page (Andrew 2026-10-06: "make the icons disappear to the
// left and right of the screen when you scroll down and come back in"; "flashcards to the first,
// computer to the second"; then all four by their own projects in Selected work).
//
//   hero      the hero's own set (in hero.tsx) slides out sideways as the hero scrolls away:
//             HeroExit writes --t (0 home, 1 gone) on its layer, CSS turns it into the slide
//   Contents  the flashcards slide in onto row 01's top right corner and the laptop onto row
//             02's, larger (1.8x); they stay on their rows and scroll away with them, gone once
//             the rows are off the top or under the Blueberry chapter rising over the pinned
//             Contents (Andrew 2026-10-07: "make them stay until they're basically out of screen")
//   work      as Selected work comes up, those two fall straight in from the top of the screen
//             with the spin and land first, by Flashcards and Second Brain; the phone and the
//             pencil slide in a beat later ("the other icons will kinda catch up") to land by
//             Blueberry and the Focus Family Guide
//
// How: ObjectsFly portals a second set of the four into <body>, in a fixed layer that takes no
// pointer. Once a frame while scrolling it reads each destination from the page
// (getBoundingClientRect of the Contents rows and of the #work index links, matched by href, so
// those sections need no hooks for it) and writes, per object, where to stand (--fx, --fy, through
// the `translate` property, instantly, so it rides along with its row), how far in it is (--p,
// 0 away, 1 landed), its size there (--sc), where it comes in from (--sx, --dy) and whether it
// shows at all (--o). The CSS (hero-objects.css, .hob-fly) turns --p into the spin-fall of the
// hero's entrance: in from off its side and above, tumbling about its vertical axis, with a spring
// transition on `transform`, so it lands with an overshoot when the scroll stops. Scroll position
// decides everything, so scrolling back up runs each step in reverse.
// A landed object is a real link (takes the pointer, in the tab order); an away one is neither.
// Reduced motion: no flight; each object stands at whichever of its stops is nearest the middle
// of the screen, and the hero's set stays put.
//
// Pattern: createPortal renders into document.body, outside the sections, so no section's
// stacking or overflow clipping can hide the layer. It renders only after mount (the useState
// flag), because the server has no document.body.

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const reduced = () => document.documentElement.getAttribute('data-motion') === 'reduced';

/** The hero's set: --t on its layer from the hero's scroll (0 at the top, 1 when 60% is gone). */
export function HeroExit() {
  useEffect(() => {
    const host = document.getElementById('top');
    const layer = host?.querySelector<HTMLElement>('.hob-layer');
    if (!host || !layer) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = host.getBoundingClientRect();
      const t = reduced() ? 0 : clamp((-box.top - box.height * 0.08) / (box.height * 0.52));
      layer.style.setProperty('--t', t.toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
  }, []);
  return null;
}

type Key = 'pencil' | 'laptop' | 'phone' | 'card';
// x, y: where it stands (its centre, screen px); p: how far in (0 away, 1 landed); sc: its size
// there; sx, dy: where it comes in from (sx: -1 the left edge, 1 the right, 0 straight down; dy:
// px above); o: 0 hides it in place (its row has gone off screen or under the Blueberry chapter)
type Stop = { x: number; y: number; p: number; mid: number; sc: number; sx: number; dy: number; o: number };

// The Selected work index link of each object's project (projects.tsx rowHref)
const WORK_HREF: Record<Key, string> = { pencil: '#work-guide', laptop: '#work-brain', phone: '#blueberry', card: '#work-flashcards' };
// The Contents row each object sits on (only these two stop there)
const CONTENTS_ROW: Partial<Record<Key, number>> = { card: 0, laptop: 1 };
const SIDE: Record<Key, number> = { pencil: -1, phone: -1, laptop: 1, card: 1 };
// When each one reaches Selected work, as the index's top rises: the two from the Contents first
// (from 115% of the screen down, falling straight in from above), the phone and the pencil a
// beat later (from 70% and 62%), sliding in from their sides, so they catch up
const WORK_START: Record<Key, number> = { card: 1.15, laptop: 1.1, phone: 0.7, pencil: 0.62 };

function contentsStop(key: Key, el: HTMLElement, vh: number, narrow: boolean): Stop | null {
  const rowIndex = CONTENTS_ROW[key];
  if (rowIndex === undefined) return null;
  const rows = document.querySelectorAll<HTMLElement>('#contents .toc-row');
  const row = rows[rowIndex];
  if (!row) return null;
  const w = el.offsetWidth, h = el.offsetHeight;
  const r = row.getBoundingClientRect();
  // in from its side as the row rises from the bottom of the screen
  const p = clamp((vh * 0.95 - r.top) / (vh * 0.4));
  // then it stays on its row and scrolls away with it; it goes once the row is off the top, or
  // once the Blueberry chapter rising over the pinned Contents has covered the row
  const chapter = document.getElementById('blueberry')?.getBoundingClientRect().top ?? Infinity;
  const o = r.bottom > 0 && chapter > r.top + r.height * 0.4 ? 1 : 0;
  // wide: over the row's top right corner, mostly outside the card, so the title and the arrow
  // stay clear (the laptop a little lower and further out, so the two overlap only at a corner);
  // a phone: a small pair sitting on the card's top edge at its right corner
  // 1.8x where the screen has room right of the card, down to 1x where it has less, so it never
  // has to be pushed back over the arrows
  const f = rowIndex ? 0.64 : 0.42;
  const sc = narrow ? 1 : Math.min(1.8, Math.max(1, (window.innerWidth - r.right - 8) / (w * (f + 0.5))));
  const x = narrow
    ? r.right - 22 - (2 - rowIndex) * (w + 10) + w / 2
    : Math.min(r.right + w * sc * f, window.innerWidth - (w * sc) / 2 - 8);
  const y = narrow ? rows[0].getBoundingClientRect().top - 10 : r.top + h * sc * (rowIndex ? 0.35 : -0.12);
  return { x, y, p, mid: r.top + r.height / 2, sc, sx: SIDE[key], dy: -0.4 * vh, o };
}

function workStop(key: Key, el: HTMLElement, vh: number, narrow: boolean): Stop | null {
  const link = document.querySelector<HTMLElement>(`#work .wk-index a[href="${WORK_HREF[key]}"]`);
  const index = document.querySelector<HTMLElement>('#work .wk-index');
  if (!link || !index) return null;
  const w = el.offsetWidth, h = el.offsetHeight;
  const r = link.getBoundingClientRect();
  // the title's text itself (its span is as wide as the row), measured with a Range
  const label = link.querySelector<HTMLElement>('.roll-a');
  let title: DOMRect = r;
  if (label) { const range = document.createRange(); range.selectNodeContents(label); title = range.getBoundingClientRect(); }
  // wide: just right of the title; a phone: at the row's right end, low, beside its subtitle
  const x = narrow ? r.right - w / 2 - 4 : title.right + 28 + w / 2;
  const y = narrow ? r.bottom - h / 2 - 6 : r.top + r.height / 2;
  const p = clamp((vh * WORK_START[key] - index.getBoundingClientRect().top) / (vh * 0.3));
  // the two from the Contents fall straight down from above the screen; the others slide in
  const falls = CONTENTS_ROW[key] !== undefined;
  return { x, y, p, mid: r.top + r.height / 2, sc: 1, sx: falls ? 0 : SIDE[key], dy: falls ? -(y + h + 40) : -0.4 * vh, o: 1 };
}

export function ObjectsFly() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  useEffect(() => {
    if (!host) return;
    const layer = document.querySelector<HTMLElement>('.hob-fly');
    if (!layer) return;
    const objects = [...layer.querySelectorAll<HTMLElement>('.hob')].map(el => ({
      el, key: (['pencil', 'laptop', 'phone', 'card'] as Key[]).find(k => el.classList.contains(`hob-${k}`))!,
    }));
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const narrow = window.innerWidth < 700;
      const still = reduced();
      for (const { el, key } of objects) {
        const toc = contentsStop(key, el, vh, narrow);
        const work = workStop(key, el, vh, narrow);
        const list = [toc, work].filter((stop): stop is Stop => stop !== null);
        if (!list.length) continue;
        // Selected work once its arrival has begun, otherwise the Contents row (if it has one);
        // under reduced motion, whichever stop is nearest the middle of the screen, landed
        const best = still
          ? list.reduce((a, b) => (Math.abs(b.mid - vh / 2) < Math.abs(a.mid - vh / 2) ? b : a))
          : work && (work.p > 0 || !toc) ? work : (toc ?? list[0]);
        const p = still ? 1 : best.p;
        el.style.setProperty('--fx', `${Math.round(best.x)}px`);
        el.style.setProperty('--fy', `${Math.round(best.y)}px`);
        el.style.setProperty('--p', p.toFixed(3));
        el.style.setProperty('--sc', String(best.sc));
        el.style.setProperty('--sx', String(best.sx));
        el.style.setProperty('--dy', `${Math.round(best.dy)}px`);
        el.style.setProperty('--o', String(best.o));
        const landed = p > 0.9 && best.o === 1;
        el.tabIndex = landed ? 0 : -1;
        el.toggleAttribute('data-landed', landed);
        if (landed) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true');
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    // fonts and images arriving move the rows, so read again a little later too
    const late = window.setTimeout(update, 1200);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const mo = new MutationObserver(onScroll);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    return () => {
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll);
      mo.disconnect(); cancelAnimationFrame(frame); window.clearTimeout(late);
    };
  }, [host]);

  return host ? createPortal(<HeroObjects className="hob-fly" />, host) : null;
}
