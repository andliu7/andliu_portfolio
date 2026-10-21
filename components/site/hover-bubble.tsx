'use client';
import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { ArrowUpRight, Maximize2, RotateCcw } from 'lucide-react';
import { useFinePointer } from './use-fine-pointer';
import { useReducedMotion } from './use-reduced-motion';
import './hover-bubble.css';

// The hover bubble: one round label that rides beside the mouse while it is over a picture that
// carries `data-bubble` (Andrew 2026-10-20: "over images I want there to be a circle that appears
// beside the mouse. on the right if it's on the left of the page, on the left if the mouse is on
// the right ... focus on what the user can DO with it"). The words come from HOVER in lib/site.ts;
// the element that carries them must really do that on click, and must say the same thing to a
// screen reader (its link name, alt or aria-label), because this bubble is aria-hidden.
//
//   <a href="..." data-bubble="Open the periodic table" data-bubble-icon="open">...</a>
//
//   - Mounted once (app/layout.tsx) and driven by delegated listeners on the document, so the
//     pictures stay server markup with two data attributes and no client code of their own.
//   - Beside the arrowhead cursor (components/mascot/), never on it: to its right in the left half
//     of the screen, to its left in the right half, clamped inside the screen. Crossing the middle
//     slides it over on the same spring that trails the pointer.
//   - A control inside a bubbled element (a title link in a fan card) owns its own click, so the
//     bubble hides over it rather than promise the wrong thing.
//   - Hidden while a button is held (a fan drag is not a click) and when the pointer leaves the page.
//   - A mouse or trackpad only (useFinePointer): nothing renders on touch. Reduced motion keeps
//     the bubble but drops the trail and the scale-in: it snaps to its place.
//
// Pattern: motion values, not state. The pointer handler writes x and y into useMotionValue and
// the words straight into the DOM, so React never re-renders while the mouse moves; useSpring
// follows those values for the trail and motion.div applies them as a transform.

const SIZE = 128; // the disc's diameter, in px (hover-bubble.css --hb-size)
const GAP = 30;   // from the cursor's hotspot to the disc's near edge: clears the 24px arrowhead
const EDGE = 8;   // the closest the disc comes to the screen's edge
const SPRING = { stiffness: 420, damping: 32, mass: 0.7 }; // a small overshoot, like --ease-elastic

export function HoverBubble() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, SPRING);
  const sy = useSpring(my, SPRING);

  useEffect(() => {
    const root = rootRef.current, text = textRef.current;
    if (!fine || !root || !text) return;
    let on: Element | null = null;
    let px = -1, py = -1, raf = 0;

    const place = (snap: boolean) => {
      const W = window.innerWidth, H = window.innerHeight;
      const x = px < W / 2 ? px + GAP : px - GAP - SIZE;
      const y = py - SIZE / 2;
      const cx = Math.min(Math.max(x, EDGE), W - SIZE - EDGE);
      const cy = Math.min(Math.max(y, EDGE), H - SIZE - EDGE);
      mx.set(cx);
      my.set(cy);
      if (snap) { sx.jump(cx); sy.jump(cy); }
    };

    /** Which bubbled element is under the pointer, or null when there is none to show. */
    const resolve = (target: EventTarget | null) => {
      const el = (target as Element | null)?.closest?.('[data-bubble]') ?? null;
      if (!el || !el.getAttribute('data-bubble')) return null;
      const ctl = (target as Element).closest('a, button');
      return ctl && ctl !== el && el.contains(ctl) ? null : el;
    };

    const show = (el: Element | null) => {
      if (el === on && (!el || text.textContent === el.getAttribute('data-bubble'))) return;
      const was = on;
      on = el;
      if (!el) { delete root.dataset.on; return; }
      text.textContent = el.getAttribute('data-bubble');
      root.dataset.icon = el.getAttribute('data-bubble-icon') ?? 'open';
      root.dataset.on = '';
      // Appearing from nothing: start at the pointer, not spring in from the last place.
      if (!was) place(true);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX;
      py = e.clientY;
      show(e.buttons ? null : resolve(e.target));
      if (on) place(false);
    };
    // The page can move under a still pointer (scrolling, a fan card coming round, a window
    // flipping after a click), so those look again at whatever is now under it, once per frame.
    const recheck = () => {
      if (px < 0 || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        show(resolve(document.elementFromPoint(px, py)));
        if (on) place(false);
      });
    };
    const onLeave = (e: PointerEvent) => { if (!e.relatedTarget) show(null); };
    const onDown = () => show(null);

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerout', onLeave, { passive: true });
    document.addEventListener('click', recheck);
    window.addEventListener('scroll', recheck, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerout', onLeave);
      document.removeEventListener('click', recheck);
      window.removeEventListener('scroll', recheck);
      cancelAnimationFrame(raf);
      delete root.dataset.on;
    };
  }, [fine, mx, my, sx, sy]);

  if (!fine) return null;
  return (
    <motion.div ref={rootRef} className="hover-bubble" aria-hidden="true" style={{ x: reduced ? mx : sx, y: reduced ? my : sy }}>
      <span className="hb-disc">
        <span ref={textRef} className="hb-text" />
        <span className="hb-icon">
          <ArrowUpRight data-i="open" size={18} strokeWidth={2.6} />
          <RotateCcw data-i="flip" size={16} strokeWidth={2.6} />
          <Maximize2 data-i="enlarge" size={16} strokeWidth={2.6} />
        </span>
      </span>
    </motion.div>
  );
}

export default HoverBubble;
