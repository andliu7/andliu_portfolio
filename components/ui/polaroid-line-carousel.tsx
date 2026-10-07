'use client';

import * as React from 'react';
import { useReducedMotion } from '@/components/site/use-reduced-motion';
import './polaroid-line-carousel.css';

/*
 * Polaroid Line Carousel (Andrew's pasted component, 2026-10-07), restyled to the site: prints
 * pegged to a sagging string. Drag the line (or use the arrows) and the prints slide along it,
 * swinging on their pegs with the speed you give them and settling back with a little overshoot;
 * at rest they sway in a light breeze. The print in the middle is the one you are looking at.
 *
 * Drag (mouse or touch), click a print, Left/Right keys, and autoplay. Changes from the paste:
 *   - every slide is a real capture, so the painted-landscape fallback is gone
 *   - a slide may carry a `video`: only the front print plays it, muted and looping, and only
 *     while the carousel is on screen; autoplay waits until it has played through once
 *   - autoplay also waits while the carousel is off screen
 *   - reduced motion (html[data-motion="reduced"]): no swing, no sway, no autoplay, and the line
 *     jumps to the chosen print instead of springing
 *   - labels come in as props (lib/site.ts holds every word), styles live in the .css beside it
 *
 * Pattern: the physics runs in a requestAnimationFrame loop that writes transforms straight to
 * the DOM through refs, so sixty frames a second never re-render React. React state holds only
 * what the markup shows (which print is in front, whether a drag is on, the measured size).
 */

export type Slide = {
  image: string;
  /** The 800px file for the srcset, when there is one. */
  sm?: string;
  title: string;
  caption?: string;
  alt: string;
  /** A muted loop shown in place of the image while this print is in front. */
  video?: string;
  /** A link under the caption (the live route), with its visible text. */
  href?: string;
  linkText?: string;
};

export type PolaroidLineCarouselProps = {
  slides: Slide[];
  /** Any CSS length. */
  height?: number | string;
  /** Width of a print in px (it shrinks on narrow screens). */
  cardWidth?: number;
  /** How far the string sags in the middle, px. */
  sag?: number;
  /** How much the prints swing; 0 holds them still. */
  swing?: number;
  /** ms per print; 0 turns autoplay off. It waits while someone is interacting. */
  autoplay?: number;
  /** The print in front at first. */
  start?: number;
  onChange?: (index: number) => void;
  className?: string;
  label: string;
  prevLabel: string;
  nextLabel: string;
};

// #region logic
export function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v));
}

/** Height of a string sagging by `sag` between (0, y0) and (w, y0), at x. */
export function stringY(x: number, w: number, y0: number, sag: number): number {
  const t = clamp(x / w, 0, 1);
  return y0 + 4 * sag * t * (1 - t);
}

/** One step of a critically damped spring toward target. */
export function springStep(x: number, v: number, target: number, dt: number, k = 70): [number, number] {
  const c = 2 * Math.sqrt(k);
  const nv = v + (k * (target - x) - c * v) * dt;
  return [x + nv * dt, nv];
}

/** One step of a print's swing. lineVel is the prints' on-screen speed (px/s, + = moving right); a print lags behind the motion, is pulled back by gravity and damped. */
export function swingStep(a: number, w: number, lineVel: number, dt: number, gain: number): [number, number] {
  const nw = w + (-38 * a - 4.2 * w + lineVel * 0.0034 * gain) * dt;
  return [clamp(a + nw * dt, -0.6, 0.6), nw];
}

/** Index of the print nearest the centre for a line offset. */
export function nearestAt(off: number, spacing: number, n: number): number {
  return clamp(Math.round(off / spacing), 0, Math.max(0, n - 1));
}

export function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}
// #endregion logic

export default function PolaroidLineCarousel({
  slides,
  height = 700,
  cardWidth = 360,
  sag = 46,
  swing = 1,
  autoplay = 5000,
  start = 0,
  onChange,
  className,
  label,
  prevLabel,
  nextLabel,
}: PolaroidLineCarouselProps) {
  const n = slides.length;
  const reduced = useReducedMotion();
  const [active, setActive] = React.useState(start);
  const [dragging, setDragging] = React.useState(false);
  const [onScreen, setOnScreen] = React.useState(false);
  const [size, setSize] = React.useState({ w: 1200, h: 700, cw: cardWidth });
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const pathRef = React.useRef<SVGPathElement | null>(null);
  const cards = React.useRef<(HTMLDivElement | null)[]>([]);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const sim = React.useRef({ off: 0, vel: 0, target: 0, a: [] as number[], w: [] as number[] });
  const drag = React.useRef<null | { x: number; off: number; lx: number; lt: number; v: number; moved: boolean }>(null);
  const lastTouch = React.useRef(0);
  const activeRef = React.useRef(start);
  const visibleRef = React.useRef(false);
  // Set once the front print's video has played through (or cannot play), so autoplay may move on.
  const videoDone = React.useRef(true);
  // useRef as a mailbox: the animation loop reads the latest props without restarting.
  const opts = React.useRef({ sag, swing, reduced });
  opts.current = { sag, swing, reduced };

  const spacing = size.cw * 1.08;
  const goTo = React.useCallback(
    (i: number) => {
      const S = sim.current;
      S.target = clamp(i, 0, n - 1) * spacing;
      if (opts.current.reduced) { S.off = S.target; S.vel = 0; }
    },
    [n, spacing],
  );

  // Measure the box; prints are as large as fit (4:3 shots, so a print is about 0.9 of its width tall).
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => {
      const r = root.getBoundingClientRect();
      const cw = Math.round(Math.max(180, Math.min(cardWidth, r.width * (r.width < 640 ? 0.74 : 0.42), r.height * 0.56)));
      setSize({ w: r.width, h: r.height, cw });
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [cardWidth]);

  // Keep the line on the front print when the spacing changes.
  React.useEffect(() => {
    sim.current.target = activeRef.current * spacing;
    sim.current.off = activeRef.current * spacing;
  }, [spacing]);

  React.useEffect(() => {
    onChange?.(active);
  }, [active, onChange]);

  // A new front print with a video holds autoplay until that video loops once.
  React.useEffect(() => {
    videoDone.current = !slides[active]?.video;
  }, [active, slides]);

  // The simulation, written straight to the DOM each frame.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let prev = performance.now();
    const S = sim.current;
    const frame = (now: number) => {
      raf = 0;
      if (!visibleRef.current) return;
      const dt = Math.min(0.033, (now - prev) / 1000);
      prev = now;
      const { w, h, cw } = size;
      const o = opts.current;
      const y0 = Math.max(36, h * 0.12);
      const d = drag.current;
      let lineVel: number;
      if (d && d.moved) {
        lineVel = d.v * 1000;
      } else if (o.reduced) {
        S.off = S.target; S.vel = 0; lineVel = 0;
      } else {
        const before = S.off;
        [S.off, S.vel] = springStep(S.off, S.vel, S.target, dt);
        lineVel = -(S.off - before) / Math.max(dt, 1e-3);
      }
      const g = o.reduced ? 0 : o.swing;
      const near = nearestAt(S.off, spacing, n);
      for (let i = 0; i < n; i++) {
        const el = cards.current[i];
        if (!el) continue;
        const x = w / 2 + i * spacing - S.off;
        if (x < -cw * 1.5 || x > w + cw * 1.5) {
          el.style.visibility = 'hidden';
          continue;
        }
        el.style.visibility = 'visible';
        let a = S.a[i] || 0;
        let av = S.w[i] || 0;
        [a, av] = swingStep(a, av, lineVel, dt, g);
        if (g) a += Math.sin(now / 1300 + i * 1.7) * 0.0009 * g;
        if (!g) { a = 0; av = 0; }
        S.a[i] = a;
        S.w[i] = av;
        const y = stringY(x, w, y0, o.sag) - 6;
        el.style.transform = 'translate(' + (x - cw / 2).toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + a.toFixed(4) + 'rad)';
        el.style.zIndex = String(i === near ? n + 1 : n - Math.abs(i - near));
      }
      pathRef.current?.setAttribute('d', 'M0 ' + y0 + ' Q' + w / 2 + ' ' + (y0 + 2 * o.sag) + ' ' + w + ' ' + y0);
      if (near !== activeRef.current) {
        activeRef.current = near;
        setActive(near);
      }
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      visibleRef.current = e.isIntersecting;
      setOnScreen(e.isIntersecting);
      if (e.isIntersecting && !raf) {
        prev = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [size, spacing, n]);

  // Autoplay, back to the first print after the last. Off under reduced motion, paused off screen,
  // while someone is interacting, and while the front print's video has not yet played through.
  React.useEffect(() => {
    if (!autoplay || n < 2 || reduced) return;
    const t = window.setInterval(() => {
      if (document.hidden || !visibleRef.current || drag.current || !videoDone.current) return;
      if (performance.now() - lastTouch.current < autoplay) return;
      goTo(activeRef.current >= n - 1 ? 0 : activeRef.current + 1);
    }, autoplay);
    return () => window.clearInterval(t);
  }, [autoplay, n, goTo, reduced]);

  // The front print's video plays only while the carousel is on screen.
  const playing = !reduced && onScreen;
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) v.play().catch(() => { videoDone.current = true; }); // autoplay can be refused; the still stays
    else v.pause();
  }, [playing, active]);

  const onVideoTime = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    const last = Number(v.dataset.t || 0);
    if (v.currentTime < last) videoDone.current = true; // it wrapped: one loop played
    v.dataset.t = String(v.currentTime);
  };

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.pl-bar')) return;
    lastTouch.current = performance.now();
    drag.current = { x: e.clientX, off: sim.current.off, lx: e.clientX, lt: e.timeStamp, v: 0, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      setDragging(true);
      rootRef.current?.setPointerCapture(e.pointerId);
    }
    if (!d.moved) return;
    const dt = Math.max(1, e.timeStamp - d.lt);
    d.v = 0.7 * ((e.clientX - d.lx) / dt) + 0.3 * d.v;
    d.lx = e.clientX;
    d.lt = e.timeStamp;
    const max = (n - 1) * spacing;
    let off = d.off - dx;
    if (off < 0) off *= 0.35;
    if (off > max) off = max + (off - max) * 0.35;
    sim.current.off = off;
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    lastTouch.current = performance.now();
    if (!d) return;
    if (d.moved) {
      setDragging(false);
      sim.current.vel = -d.v * 1000;
      goTo(nearestAt(sim.current.off - d.v * 180, spacing, n));
      return;
    }
    const card = (e.target as HTMLElement).closest('[data-i]');
    if (card) goTo(Number(card.getAttribute('data-i')));
  };
  const step = (dir: number) => {
    lastTouch.current = performance.now();
    goTo(clamp(activeRef.current + dir, 0, n - 1));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return; // the bar's buttons and link keep their own keys
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else return;
    e.preventDefault();
  };

  const s = slides[active];

  return (
    <div
      ref={rootRef}
      className={['pl-root', className].filter(Boolean).join(' ')}
      style={{ height, ['--pl-cw' as string]: size.cw + 'px' }}
      data-drag={dragging ? '1' : '0'}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <svg className="pl-string" aria-hidden="true">
        <path ref={pathRef} fill="none" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {slides.map((sl, i) => (
        <div
          key={sl.image}
          className="pl-card"
          data-i={i}
          data-on={i === active ? '1' : '0'}
          // A callback ref: React calls it with each card's element, so the loop can move them.
          ref={el => void (cards.current[i] = el)}
          aria-hidden={i === active ? undefined : true}
        >
          <div className="pl-print">
            <div className="pl-shot">
              <img
                src={sl.sm ?? sl.image}
                srcSet={sl.sm ? `${sl.sm} 800w, ${sl.image} 1600w` : undefined}
                sizes={`${size.cw}px`}
                alt={sl.alt}
                draggable={false}
                loading={Math.abs(i - start) > 1 ? 'lazy' : undefined}
                decoding="async"
              />
              {sl.video && i === active && !reduced ? (
                <video
                  ref={videoRef}
                  src={sl.video}
                  poster={sl.image}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                  onTimeUpdate={onVideoTime}
                />
              ) : null}
            </div>
            <div className="pl-note"><span className="pl-pill">{sl.title}</span></div>
          </div>
          <div className="pl-peg" />
        </div>
      ))}
      <div className="pl-bar">
        <div className="pl-cap" key={active}>
          <span className="pl-title" aria-hidden="true">{s?.title}</span>
          {s?.caption ? <span className="pl-sub" aria-hidden="true">{s.caption}</span> : null}
          {s?.href ? (
            <a className="pl-link" href={s.href} target="_blank" rel="noreferrer">{s.linkText ?? s.href}</a>
          ) : null}
        </div>
        <span className="pl-count" aria-hidden="true">
          <b>{pad2(active + 1)}</b> / {pad2(n)}
        </span>
        <button type="button" className="square-btn pl-btn" aria-label={prevLabel} onClick={() => step(-1)} disabled={active === 0}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
        <button type="button" className="square-btn pl-btn" aria-label={nextLabel} onClick={() => step(1)} disabled={active === n - 1}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      </div>
      <div className="pl-sr" aria-live="polite">
        {`${active + 1} / ${n}: ${s?.title ?? ''}. ${s?.caption ?? ''}`}
      </div>
    </div>
  );
}
