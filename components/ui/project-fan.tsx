'use client';
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useReducedMotion } from '@/components/site/use-reduced-motion';
import { getLenis } from '@/app/smooth';

// ProjectFan: Selected work's projects 02 to 06 as one fan of cards (Andrew 2026-10-07: "fan them
// out", "drag swipe through", "when you hover it enlarges and maybe you can see the description",
// "the cards scroll up as one and then fan out ... come back together when you scroll down").
// Built from the mechanics of the three components he pasted (scratchpad
// projects-carousel-brief.md): the GSAP card fan's slots (rotation, scale, a smile curve, centre
// on top, neighbours pushed apart around a hovered card), the coverflow's fractional position
// (drag moves it, a flick carries at most 2 cards, it settles on a whole card, loops the short
// way round with no cloned cards, touch-action pan-y) and the connected carousel's spring.
//
// Every card's place comes from three numbers, recomputed every frame:
//   pos     where the fan is, in cards (fractional while it moves); card i sits at offset i - pos,
//           folded into -n/2..n/2 so the fan loops
//   g       0 a stacked pile, 1 fanned out, from the frame's place on screen: it rises as a pile,
//           fans out as it comes up, and gathers back into the pile as it leaves the top
//   hover   per card, 0 to 1 on a spring: the hovered card lifts and grows, the rest move away
// The caption under the fan shows the hovered card's words, else the centre card's.
// Touch: the caption is always shown (there is no hover); tap a side card to bring it round.
// A swipe moves at most one card more than the distance dragged, so a short swipe is one card.
// Reduced motion: no fan, no scroll choreography; the cards are a row that scrolls sideways and
// snaps, and the arrow buttons step through it.
//
// Pattern: refs, not state, for anything that changes every frame. `motion` is one mutable object
// the handlers and the frame loop share; the loop writes each card's transform straight to the
// DOM, so React re-renders only when the centre card, the hovered card or the caption changes.

// `id` is the card's element id (the target of #links), `label` its accessible name.
export type FanItem = { id: string; label: string; card: ReactNode; caption: ReactNode };

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Folds an offset into -n/2..n/2, the short way round the loop. */
const fold = (o: number, n: number) => ((((o + n / 2) % n) + n) % n) - n / 2;
const mod = (i: number, n: number) => ((i % n) + n) % n;
// A pile is never perfectly square: a fixed small tilt per card (no random, so server and
// client agree and it looks the same every visit).
const PILE_TILT = [-4, 3, -1.5, 5, -6, 2, -3];
// Horizontal centres on screen, for the reduced-motion row: a card's, and the frame's visible box.
const centreOf = (el: Element) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
const frameCentre = (frame: HTMLElement) => frame.getBoundingClientRect().left + frame.clientLeft + frame.clientWidth / 2;

export function ProjectFan({ items, name, prevLabel, nextLabel, className = '' }: {
  items: readonly FanItem[];
  /** The carousel's accessible name. */
  name: string;
  prevLabel: string;
  nextLabel: string;
  className?: string;
}) {
  const n = items.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [entered, setEntered] = useState(false);
  const motion = useRef({
    pos: 0, vel: 0, target: 0, g: 0, hover: -1, moved: false,
    amt: Array.from({ length: n }, () => 0), amtVel: Array.from({ length: n }, () => 0),
    drag: null as null | { x: number; pos: number; last: number; t: number },
    pitch: 300,
  });

  /** Brings card `index` to the centre, the short way round. */
  const goTo = (index: number) => {
    const m = motion.current;
    const i = mod(index, n);
    if (reduced) {
      const frame = frameRef.current, card = cardRefs.current[i];
      // measured on screen (not offsetLeft, which counts from the track and misses the frame's padding)
      if (frame && card) frame.scrollBy({ left: centreOf(card) - frameCentre(frame) });
    } else {
      m.target = Math.round(m.target) + fold(i - Math.round(m.target), n);
    }
    setActive(i);
  };
  const step = (by: number) => goTo(active + by);

  // The frame loop (full motion only): reads the frame's place on screen, steps the springs and
  // writes every card's transform. It runs only while the fan is near the screen.
  useEffect(() => {
    const frame = frameRef.current, root = rootRef.current;
    const cards = cardRefs.current;
    if (!frame || !root) return;
    if (reduced) {
      cards.forEach(card => { if (card) { card.style.transform = ''; card.style.zIndex = ''; card.style.opacity = ''; } });
      setEntered(true);
      return;
    }
    const m = motion.current;
    let raf = 0, last = 0, width = 300, vh = 800, narrow = false, seen = false;
    const measure = () => {
      width = cards[0]?.offsetWidth ?? 300;
      vh = window.innerHeight;
      narrow = window.innerWidth < 700;
      m.pitch = width * (narrow ? 0.6 : 0.74);
    };
    const tick = (now: number) => {
      const dt = Math.min(0.034, last ? (now - last) / 1000 : 0.016);
      last = now;
      // the position spring (stiffness 170, damping 24: one small overshoot, then still)
      if (!m.drag) {
        m.vel += (170 * (m.target - m.pos) - 24 * m.vel) * dt;
        m.pos += m.vel * dt;
      }
      // the scroll choreography: rise as a pile, fan out, gather again on the way out
      // (measured on the track, the cards' own box: the frame reaches past it above and below)
      const r = (frame.firstElementChild ?? frame).getBoundingClientRect();
      const rise = clamp((vh - r.top) / (vh * 0.35));
      // in: a pile until the cards' top passes 60% of the screen, fanned by 30%; out: they start to
      // gather once the top passes 10% (under the header), a pile again once 30% of the cards' box is
      // above the screen, so the fan closes as one group while it is still in view
      const g = smooth(Math.min(clamp((vh * 0.6 - r.top) / (vh * 0.3)), clamp((r.top + r.height * 0.3) / (vh * 0.1 + r.height * 0.3))));
      m.g = g;
      if (!seen && rise > 0.25) { seen = true; setEntered(true); }
      root.style.setProperty('--g', g.toFixed(3));
      // the hover springs (stiffer and bouncier: they answer the pointer)
      for (let i = 0; i < n; i++) {
        const goal = i === m.hover && g > 0.85 && !m.drag ? 1 : 0;
        m.amtVel[i] += (260 * (goal - m.amt[i]) - 17 * m.amtVel[i]) * dt;
        m.amt[i] += m.amtVel[i] * dt;
      }
      const offsets = cards.map((_, i) => fold(i - m.pos, n));
      for (let i = 0; i < n; i++) {
        const card = cards[i];
        if (!card) continue;
        const o = offsets[i], a = Math.abs(o);
        // the fan slot: out to the side, down a smile curve, turned and a little smaller
        let fx = o * m.pitch * (1 - 0.05 * a);
        let fy = a * a * width * 0.05;
        let fr = o * 6;
        let fs = 1 - 0.07 * a;
        // the hovered card lifts and grows; the others are pushed away from it, more the closer
        for (let j = 0; j < n; j++) {
          const A = m.amt[j];
          if (Math.abs(A) < 0.001) continue;
          if (j === i) { fy -= width * 0.1 * A; fs *= 1 + 0.08 * A; fr *= 1 - 0.7 * A; continue; }
          const d = o - offsets[j];
          const side = Math.sign(d);
          fx += side * width * 0.3 * A / Math.max(1, Math.abs(d)) ** 0.7;
          fr += side * 3 * A;
        }
        // the pile: almost on top of each other, each with its own small tilt
        const px = o * 6, py = -a * 5, pr = PILE_TILT[i % PILE_TILT.length], ps = 0.94;
        const x = px + (fx - px) * g;
        let y = py + (fy - py) * g;
        const rot = pr + (fr - pr) * g;
        const sc = ps + (fs - ps) * g;
        // rising from below, the cards nearest the middle a moment first
        y += (1 - smooth(clamp(rise * 1.25 - a * 0.08))) * vh * 0.4;
        card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        card.style.zIndex = String(m.amt[i] > 0.5 ? 200 : 100 - Math.round(a * 10));
        // the card crossing the far side of the loop fades out and back in
        card.style.opacity = clamp((n / 2 - a) / 0.45).toFixed(3);
        // which side of the centre it sits on: a right-hand card's left edge is under its
        // neighbour, so CSS sets its title to the right (written only when it changes)
        const side = o > 0.5 ? 'right' : 'left';
        if (card.dataset.side !== side) card.dataset.side = side;
      }
      raf = requestAnimationFrame(tick);
    };
    measure();
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      if (entry.isIntersecting) raf = requestAnimationFrame(tick);
    }, { rootMargin: '50% 0px' });
    io.observe(frame);
    window.addEventListener('resize', measure);
    return () => { io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [reduced, n]);

  // Reduced motion: the row scrolls by itself, so the centre card is whichever is nearest the middle.
  useEffect(() => {
    const frame = frameRef.current;
    if (!reduced || !frame) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const middle = frameCentre(frame);
        let best = 0, dist = Infinity;
        cardRefs.current.forEach((card, i) => {
          if (!card) return;
          const d = Math.abs(centreOf(card) - middle);
          if (d < dist) { dist = d; best = i; }
        });
        setActive(best);
      });
    };
    frame.addEventListener('scroll', onScroll, { passive: true });
    return () => { frame.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [reduced]);

  // A link to #work-<id> anywhere on the page (the index rows above) brings that card round too.
  // The page scrolls to centre the fan itself, not the card: a card's own box moves with the fan's
  // scroll choreography, so jumping to it landed past the carousel (Andrew 2026-10-07). Arriving
  // there still plays the fan's opening. Also on load, for a shared link.
  useEffect(() => {
    const ids = items.map(item => item.id);
    const fromHash = (hash: string) => ids.indexOf(hash.replace(/^#/, ''));
    const onClick = (event: globalThis.MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="#work-"]');
      if (!link || frameRef.current?.contains(link)) return;
      const i = fromHash(link.getAttribute('href') ?? '');
      if (i < 0) return;
      event.preventDefault();
      goTo(i);
      const frame = frameRef.current;
      if (!frame) return;
      // An absolute target from the real scroll position, so it is right even if Lenis has not
      // caught up with a jump the browser made on its own.
      const box = frame.getBoundingClientRect();
      const y = window.scrollY + box.top - Math.max(0, (window.innerHeight - box.height) / 2);
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { immediate: reduced });
      else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      history.replaceState(null, '', link.getAttribute('href'));
    };
    const start = fromHash(window.location.hash);
    if (start > -1) goTo(start);
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
    // goTo reads only refs, setters and `reduced`, so this re-subscribes when motion changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, items]);

  const cardIndex = (target: EventTarget | null) => {
    const li = (target as Element | null)?.closest?.('[data-i]');
    return li ? Number(li.getAttribute('data-i')) : -1;
  };

  // Drag: the pointer moves the fan's position directly; on release a flick carries on (at most
  // two cards) and the spring settles on a whole card. Listeners go on window for the drag, so
  // it keeps going when the pointer leaves the card.
  const onPointerDown = (event: PointerEvent<HTMLUListElement>) => {
    if (reduced || event.button !== 0 || cardIndex(event.target) < 0) return;
    const m = motion.current;
    m.moved = false;
    const startX = event.clientX;
    const startPos = m.pos;
    let lastPos = m.pos, lastT = performance.now();
    const move = (e: globalThis.PointerEvent) => {
      const dx = e.clientX - startX;
      if (!m.drag) {
        if (Math.abs(dx) < 6) return;
        m.drag = { x: startX, pos: startPos, last: startPos, t: lastT };
        m.moved = true;
        m.vel = 0;
        m.hover = -1;
        setHover(null);
      }
      const now = performance.now();
      m.pos = startPos - dx / m.pitch;
      const dt = Math.max(1, now - lastT) / 1000;
      m.vel = m.vel * 0.6 + ((m.pos - lastPos) / dt) * 0.4;
      lastPos = m.pos;
      lastT = now;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!m.drag) return;
      m.drag = null;
      // the flick carries the fan on, but never more than one card past the cards dragged
      const from = Math.round(startPos);
      const reach = Math.max(1, Math.round(Math.abs(m.pos - startPos)));
      const flung = clamp(m.pos + m.vel * 0.22, m.pos - 1, m.pos + 1);
      m.target = clamp(Math.round(flung), from - reach, from + reach);
      setActive(mod(m.target, n));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // A click (or Enter on a card's title link): bring a side card round. The title links stay
  // real links for the keyboard and the hero icons, but here they move the fan instead of the page.
  const onClick = (event: MouseEvent<HTMLUListElement>) => {
    const i = cardIndex(event.target);
    if (i < 0) return;
    event.preventDefault();
    if (motion.current.moved) { motion.current.moved = false; return; }
    if (i !== active) goTo(i);
  };

  const onPointerOver = (event: PointerEvent<HTMLUListElement>) => {
    if (event.pointerType !== 'mouse' || motion.current.drag) return;
    const i = cardIndex(event.target);
    motion.current.hover = i;
    setHover(i < 0 ? null : i);
  };
  const onPointerOut = (event: PointerEvent<HTMLUListElement>) => {
    if (cardIndex(event.relatedTarget) > -1) return;
    motion.current.hover = -1;
    setHover(null);
  };
  // Tabbing onto a card's title brings it round (only for the keyboard: a mouse click focuses
  // the link too, and the click handler deals with that).
  const onFocus = (event: FocusEvent<HTMLUListElement>) => {
    const i = cardIndex(event.target);
    if (i > -1 && i !== active && (event.target as Element).matches(':focus-visible')) goTo(i);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  };

  const shown = hover ?? active;
  return (
    <div
      ref={rootRef}
      className={`wk-fan ${className}`}
      data-mode={reduced ? 'row' : 'fan'}
      data-in={entered ? '' : undefined}
    >
      {/* The stage: the fan's frame and its cards. */}
      <div className="wk-fan-stage">
        <div
          ref={frameRef}
          className="wk-fan-frame"
          role="region"
          aria-roledescription="carousel"
          aria-label={name}
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <ul
            className="wk-fan-track"
            onPointerDown={onPointerDown}
            onClick={onClick}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
            onFocus={onFocus}
            onDragStart={event => event.preventDefault()}
          >
            {items.map((item, i) => (
              <li
                key={item.id}
                id={item.id}
                ref={el => { cardRefs.current[i] = el; }}
                className="wk-fan-card"
                data-i={i}
                data-active={i === active ? '' : undefined}
                data-hover={i === hover ? '' : undefined}
                aria-roledescription="slide"
                aria-label={item.label}
              >
                {item.card}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* The arrows are grid items of the fan itself, placed by CSS (app/sections/projects.css):
          beside the caption on a wide screen, so they never sit on a card, and over the faded
          edges of the fan on a phone, so they cost no height. */}
      <button type="button" className="wk-arrow wk-arrow-prev" aria-label={prevLabel} onClick={() => step(-1)}>
        <ArrowLeft size={26} strokeWidth={2.75} aria-hidden="true" />
      </button>
      <button type="button" className="wk-arrow wk-arrow-next" aria-label={nextLabel} onClick={() => step(1)}>
        <ArrowRight size={26} strokeWidth={2.75} aria-hidden="true" />
      </button>

      {/* Every caption is in the page, stacked in one grid cell so the box is as tall as the
          longest and nothing below jumps; only the shown one is visible and reachable (inert). */}
      <div className="wk-caps">
        {items.map((item, i) => (
          <div key={item.id} className="wk-cap" data-on={i === shown ? '' : undefined} inert={i !== shown}>
            {item.caption}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectFan;
