'use client';
import { useEffect, useRef, useState } from 'react';
import { EVENTS, on, type Mood } from '@/components/site/handoffs';
import { Berry, type BerryMood } from './berry';
import './mascot.css';

// The berry cursor (SITE-PLAN.md 7, A9; Andrew, 2026-10-06: the blueberry becomes the mouse and
// morphs into an arrowhead with sharp tails when it is on a button). Loaded only by
// mascot-slot.tsx, and only with a fine pointer, full motion and the menu switch on; everywhere
// else the native cursor stays.
//
//  - It IS the cursor: html[data-cursor="berry"] hides the system one (mascot.css), set on the
//    first pointer move and removed when this unmounts. Text fields keep the native I-beam, and
//    the berry steps aside over them.
//  - Its hotspot is the pointer. It follows on a stiff, slightly underdamped spring: fast enough
//    to never feel late, loose enough to overshoot a hair and settle.
//  - Over anything you can press it becomes an arrowhead, tip on the hotspot, tilted up and to
//    the left like a classic cursor (a crossfade-and-scale morph, mascot.css).
//  - As a berry it leans into its travel, stretches when it moves fast, swings its calyx a beat
//    late (follow-through), breathes, blinks, squashes when you press, gets sleepy after 8s and
//    falls asleep after 20s; moving wakes it with a hop.
//  - mascot:mood plays a mood (cheer hops twice: an Impact panel opened); mascot:peek makes it
//    curious; island:active hides it (the game runs in an iframe with its own cursor).
//
// Why no animation library: the springs are a few lines (Spring below), they run in one
// requestAnimationFrame loop that writes straight to the elements' styles (no React render per
// frame), and the loop stops itself when everything has settled. One-off squashes and hops use
// the browser's own Web Animations API (element.animate).

// Anything you can press: the arrowhead shows over these. (A list joined, like chat-dock's UNDER.)
const PRESSABLE = [
  'a[href]', 'button', '[role="button"]', '[role="switch"]', '[role="tab"]', '[role="link"]', 'summary', 'label', 'select',
  '.pill', '.square-btn', 'input[type="checkbox"]', 'input[type="radio"]', 'input[type="submit"]', 'input[type="button"]', 'input[type="range"]',
].join(', ');
const TEXT_FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="range"]), textarea, [contenteditable="true"]';

type Shape = 'berry' | 'arrow' | 'none';

/** A damped spring: value chases target. Stiffness k, damping c, mass m (per-second units). */
class Spring {
  value: number;
  velocity = 0;
  target: number;
  constructor(start: number, private k: number, private c: number, private m = 1) { this.value = start; this.target = start; }
  step(dt: number) {
    const accel = (-this.k * (this.value - this.target) - this.c * this.velocity) / this.m;
    this.velocity += accel * dt; // semi-implicit Euler: velocity first, then position (stable)
    this.value += this.velocity * dt;
  }
  get settled() { return Math.abs(this.velocity) < 0.01 && Math.abs(this.value - this.target) < 0.01; }
  jump(v: number) { this.value = v; this.target = v; this.velocity = 0; }
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function Mascot() {
  const [mood, setMood] = useState<BerryMood>('rest');
  const [blink, setBlink] = useState(false);
  const [shape, setShape] = useState<Shape>('berry');
  const [fresh, setFresh] = useState(true); // no morph animation until the first real change
  const posRef = useRef<HTMLDivElement>(null);
  const leanRef = useRef<HTMLDivElement>(null);
  const squashRef = useRef<HTMLDivElement>(null);
  const stretchRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);

  // Everything lives in one effect that runs once on mount; its cleanup undoes all of it.
  useEffect(() => {
    const pos = posRef.current, leanEl = leanRef.current, squashEl = squashRef.current;
    const stretchEl = stretchRef.current, arrow = arrowRef.current, face = faceRef.current;
    if (!pos || !leanEl || !squashEl || !stretchEl || !arrow || !face) return;
    const root = document.documentElement;

    // Follow: damping ratio .8, settles in about 150ms with a hair of overshoot.
    const x = new Spring(0, 900, 48);
    const y = new Spring(0, 900, 48);
    const lean = new Spring(0, 260, 20);
    const calyx = new Spring(0, 90, 7); // softer and later than the body: follow-through
    const stretch = new Spring(0, 320, 13);
    const alpha = new Spring(0, 400, 40);
    const springs = [x, y, lean, calyx, stretch, alpha];

    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000 || 1 / 60);
      last = now;
      // Targets that follow other springs: lean from the travel speed, calyx from the lean.
      lean.target = clamp(x.velocity / 120, -14, 14);
      stretch.target = clamp((Math.abs(x.velocity) - Math.abs(y.velocity)) / 7000, -0.12, 0.12);
      calyx.target = -lean.value * 1.6;
      for (const s of springs) { s.step(dt / 2); s.step(dt / 2); } // two half steps: steadier
      pos.style.transform = `translate3d(${x.value.toFixed(2)}px, ${y.value.toFixed(2)}px, 0)`;
      pos.style.opacity = clamp(alpha.value, 0, 1).toFixed(3);
      leanEl.style.transform = `rotate(${lean.value.toFixed(2)}deg)`;
      stretchEl.style.transform = `scale(${(1 + stretch.value).toFixed(3)}, ${(1 - stretch.value * 0.8).toFixed(3)})`;
      const g = face.querySelector<SVGGElement>('.berry-calyx');
      if (g) g.style.transform = `rotate(${calyx.value.toFixed(2)}deg)`;
      frame = springs.every(s => s.settled) ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => { if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick); } };

    let started = false;
    let current: Shape = 'berry';
    let lastMove = performance.now();
    let base: BerryMood = 'rest'; // rest, sleepy or asleep
    let flash: BerryMood | null = null; // a timed mood over the base
    let flashUntil = 0;
    let curious = false;
    let hidden = false; // the island is up
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
    };

    const show = () => setMood(curious ? 'curious' : flash ?? base);
    const playFlash = (next: BerryMood, ms: number) => {
      flash = next;
      flashUntil = performance.now() + ms;
      show();
      later(() => { if (performance.now() >= flashUntil) { flash = null; show(); } }, ms);
    };
    const visible = (shown: boolean) => { alpha.target = shown && !hidden ? 1 : 0; wake(); };

    // The hop: squash (anticipation), rise stretched, land squashed, settle. Keyframes, because
    // each phase has its own shape; a 120ms wind-up, then the arc.
    const hop = (height: number) => {
      if (current !== 'berry') return;
      squashEl.animate([
        { transform: 'translateY(0) scale(1, 1)' },
        { transform: 'translateY(0) scale(1.2, .8)', offset: 0.18, easing: 'cubic-bezier(.2,.7,.4,1)' },
        { transform: `translateY(${-height}px) scale(.88, 1.14)`, offset: 0.5, easing: 'cubic-bezier(.6,0,.8,.3)' },
        { transform: 'translateY(0) scale(1.16, .84)', offset: 0.72 },
        { transform: 'translateY(0) scale(.96, 1.04)', offset: 0.86 },
        { transform: 'translateY(0) scale(1, 1)' },
      ], { duration: 700 });
    };
    // The press: the berry squashes flat (or the arrow ducks), then springs back; the squash
    // lands in the first 90ms (pointer-down feedback under 100ms).
    const press = () => {
      if (current === 'arrow') {
        arrow.animate([{ transform: 'scale(1)' }, { transform: 'scale(.8)', offset: 0.3 }, { transform: 'scale(1.06)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 280 });
      } else if (current === 'berry') {
        squashEl.animate([{ transform: 'scale(1, 1)' }, { transform: 'scale(1.22, .78)', offset: 0.25 }, { transform: 'scale(.94, 1.08)', offset: 0.65 }, { transform: 'scale(1, 1)' }], { duration: 360 });
        playFlash('happy', 500);
      }
    };

    const setTo = (next: Shape) => {
      if (next === current) return;
      current = next;
      setFresh(false);
      setShape(next);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      if (!started) {
        started = true;
        root.setAttribute('data-cursor', 'berry');
        x.jump(event.clientX);
        y.jump(event.clientY);
      } else {
        x.target = event.clientX;
        y.target = event.clientY;
      }
      if (base === 'sleepy' || base === 'asleep') { base = 'rest'; playFlash('happy', 600); hop(8); }
      lastMove = performance.now();
      visible(current !== 'none');
    };

    // One delegated listener decides the shape for whatever is under the pointer.
    const onOver = (event: PointerEvent) => {
      const el = event.target as Element | null;
      const next: Shape = !el ? 'berry' : el.closest(TEXT_FIELD) ? 'none' : el.closest(PRESSABLE) ? 'arrow' : 'berry';
      setTo(next);
      visible(next !== 'none');
    };
    // Leaving the window (or into an iframe, which has its own cursor): fade out.
    const onOut = (event: PointerEvent) => { if (!event.relatedTarget) visible(false); };
    const onDown = (event: PointerEvent) => { if (event.pointerType === 'mouse' || event.pointerType === 'pen') press(); };

    // Idle: sleepy after 8s, asleep after 20s (checked once a second, paused in a hidden tab).
    const idle = window.setInterval(() => {
      if (document.hidden) return;
      const still = performance.now() - lastMove;
      const next: BerryMood = still > 20000 ? 'asleep' : still > 8000 ? 'sleepy' : 'rest';
      if (next !== base) { base = next; show(); }
    }, 1000);

    // Blink at random 2.5 to 6s, never while asleep (the eyes are already shut).
    const blinkLoop = () => later(() => {
      if (!document.hidden && base !== 'asleep') { setBlink(true); later(() => setBlink(false), 120); }
      blinkLoop();
    }, rand(2500, 6000));
    blinkLoop();

    const offPeek = on(EVENTS.mascotPeek, point => { curious = Boolean(point); show(); });
    const offMood = on(EVENTS.mascotMood, ({ mood: next, ms = 1200 }: { mood: Mood; ms?: number }) => {
      playFlash(next, ms);
      if (next === 'cheer') { hop(14); later(() => hop(9), 480); }
      else if (next === 'happy') hop(8);
    });
    const offIsland = on(EVENTS.islandActive, ({ active }) => { hidden = active; visible(!active); });

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(idle);
      timers.forEach(id => window.clearTimeout(id));
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      window.removeEventListener('pointerdown', onDown);
      offPeek(); offMood(); offIsland();
      root.removeAttribute('data-cursor'); // the native cursor comes back
    };
  }, []);

  return (
    <div className="mascot" aria-hidden="true" data-mood={mood} data-shape={shape} data-fresh={fresh ? '' : undefined}>
      <div className="mascot-pos" ref={posRef} style={{ opacity: 0 }}>
        <div className="mascot-berry" ref={leanRef}>
          <div className="mascot-shape">
            <div className="mascot-squash" ref={squashRef}>
              <div className="mascot-squash" ref={stretchRef}>
                <div className="mascot-breathe" ref={faceRef}>
                  <Berry mood={mood} blink={blink} size={32} />
                </div>
              </div>
            </div>
          </div>
          <svg className="mascot-z" width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2 2h8L2 10h8" fill="none" stroke="var(--berry)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="mascot-arrow">
          {/* The arrowhead: tip at (0,0), swept-back sharp tails, no shaft, turned 25deg so it
              points up and to the left. A paper halo under an ink outline keeps it visible on
              every ground; the right half is the berry's shade colour, a flat second shape. */}
          <svg ref={arrowRef} width="1" height="1" viewBox="0 0 1 1" aria-hidden="true">
            <g transform="rotate(-25)">
              <path d="M0 0 L10.5 23 L0 16.5 L-10.5 23 Z" fill="none" stroke="var(--paper)" strokeWidth="4.5" strokeLinejoin="round" />
              <path d="M0 0 L10.5 23 L0 16.5 L-10.5 23 Z" fill="var(--berry-2)" />
              <path d="M0 0 L10.5 23 L0 16.5 Z" fill="var(--berry)" />
              <path d="M0 0 L10.5 23 L0 16.5 L-10.5 23 Z" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="miter" strokeMiterlimit="10" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
