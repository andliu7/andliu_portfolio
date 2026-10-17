'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import './stars.css';

// The résumé page's night sky (Andrew 2026-10-12), adapted from the StarsBackground he pasted
// (animate-ui). Three layers of stars drift upward slowly, at three speeds, and lean away from
// the pointer on a spring. Now and then a shooting star crosses at a random spot, and once in a
// while a small coloured pop flares and fades, like a distant supernova. The whole sky fades out
// as you scroll through the section.
//
// Why it is built this way:
//  - Each layer is ONE 1px element whose box-shadow draws every star (the template's trick): the
//    browser paints it once, then only moves it. The drift is a CSS keyframe on transform, so it
//    runs on the compositor and stays smooth even while the page is busy (the template animated
//    it from JavaScript with motion; the CSS version never drops a frame on the main thread).
//  - The layer is 2000px tall and its stars repeat one tile below, so translating it up by
//    exactly one tile loops with no seam.
//  - The parallax uses motion's useSpring: the pointer sets a target, the spring eases toward it
//    and writes the transform itself, so React never re-renders per frame.
//  - The scroll fade, the shooting stars and the pops are written straight to the DOM (style and
//    appended elements that remove themselves), again so nothing re-renders while you scroll.
//  - Stars are generated in an effect, after the first render: random positions on the server
//    would not match the client's (a hydration mismatch).
//  - Off screen, or under reduced motion (html[data-motion="reduced"]), nothing runs: no drift,
//    no shooting stars, no pops, no fade; the stars just sit there.
//
// Decoration only: aria-hidden, pointer-events none. It fills its positioned parent.

const TILE = 2000; // px, the height of one repeat of a layer
const LAYERS = [
  { count: 520, size: 1, speed: 1 },
  { count: 200, size: 2, speed: 2 },
  { count: 90, size: 3, speed: 3 },
] as const;
// The pops borrow the site's tile colours (app/globals.css), so the sky stays in the palette.
const POP_COLOURS = ['var(--apricot)', 'var(--tile-pink)', 'var(--berry-soft)', 'var(--tile-leaf)', 'var(--tile-gold)'];

function shadows(count: number, colour: string) {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 2600);
    const y = Math.floor(Math.random() * TILE);
    out.push(`${x}px ${y}px ${colour}`, `${x}px ${y + TILE}px ${colour}`); // the tile and its repeat below
  }
  return out.join(',');
}

const reduced = () => document.documentElement.getAttribute('data-motion') === 'reduced';
const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Props = {
  className?: string;
  /** Seconds for the slowest layer to drift one tile; the others take 2x and 3x. */
  speed?: number;
  /** How far the sky leans from the pointer, as a fraction of its distance from the centre. */
  factor?: number;
  starColor?: string;
  /** Fade out while scrolling through the section. Off where the sky must carry on unchanged into
   *  the next section (Contact, whose sky runs straight into the résumé's). */
  fade?: boolean;
};

export function StarsBackground({ className = '', speed = 90, factor = 0.03, starColor = 'rgb(255 250 240 / .9)', fade: fades = true }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const [layers, setLayers] = useState<string[]>([]);
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 50, damping: 20 }), sy = useSpring(y, { stiffness: 50, damping: 20 });

  useEffect(() => { setLayers(LAYERS.map(l => shadows(l.count, starColor))); }, [starColor]);

  useEffect(() => {
    const root = rootRef.current, fx = fxRef.current;
    const section = root?.closest('section');
    if (!root || !fx || !section) return;
    let onScreen = false, raf = 0;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => { const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

    // The fade: 1 while the section's top is at or below the screen's top, down to 0 by the time
    // its bottom reaches the screen's bottom (the end of the pin's runway).
    const fade = () => {
      raf = 0;
      if (!fades || reduced()) { root.style.opacity = ''; return; }
      const r = section.getBoundingClientRect(), run = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / run));
      root.style.opacity = (1 - p).toFixed(3);
    };
    const onScroll = () => { if (onScreen && !raf) raf = requestAnimationFrame(fade); };

    // One-off effects: an element that plays a CSS animation, then removes itself.
    const spawn = (cls: string, style: Record<string, string>, ms: number) => {
      const el = document.createElement('span');
      el.className = cls;
      for (const [k, v] of Object.entries(style)) el.style.setProperty(k, v);
      fx.appendChild(el);
      window.setTimeout(() => el.remove(), ms);
    };
    // A shooting star every 3 to 8 seconds, somewhere in the upper two thirds, heading down-left
    // or down-right at a shallow random angle.
    const shoot = () => later(() => {
      if (onScreen && !reduced() && !document.hidden) {
        const right = Math.random() < .5;
        spawn('stars-shoot', { left: `${rand(10, 90)}%`, top: `${rand(4, 60)}%`, '--a': `${(right ? 1 : -1) * rand(18, 34)}deg`, '--len': `${rand(90, 170)}px` }, 1300);
      }
      shoot();
    }, rand(3000, 8000));
    // A supernova pop every 6 to 14 seconds: a small bright point that flares into a coloured
    // ring and fades.
    const pop = () => later(() => {
      if (onScreen && !reduced() && !document.hidden) {
        spawn('stars-pop', { left: `${rand(6, 94)}%`, top: `${rand(6, 88)}%`, '--c': POP_COLOURS[Math.floor(Math.random() * POP_COLOURS.length)], '--s': `${rand(10, 22)}px` }, 1700);
      }
      pop();
    }, rand(6000, 14000));
    shoot(); pop();

    // Parallax: lean away from the pointer, as the template did, but from the window, since the
    // page's content sits above the sky and would swallow the sky's own mouse events.
    const onMove = (e: PointerEvent) => {
      if (!onScreen || reduced()) return;
      x.set(-(e.clientX - window.innerWidth / 2) * factor);
      y.set(-(e.clientY - window.innerHeight / 2) * factor);
    };

    // Run only while the section is on screen: the drift pauses (data-off) and the timers skip.
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      root.toggleAttribute('data-off', !onScreen);
      if (onScreen) fade();
    });
    io.observe(section);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      timers.forEach(id => window.clearTimeout(id));
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
    };
  }, [x, y, factor, fades]);

  return (
    <div ref={rootRef} className={`stars ${className}`} aria-hidden="true" data-off="">
      <motion.div className="stars-lean" style={{ x: sx, y: sy }}>
        {layers.map((shadow, i) => (
          <div key={i} className="stars-layer" style={{ animationDuration: `${speed * LAYERS[i].speed}s` }}>
            <span className="stars-dots" style={{ width: LAYERS[i].size, height: LAYERS[i].size, boxShadow: shadow }} />
          </div>
        ))}
      </motion.div>
      <div ref={fxRef} className="stars-fx" />
    </div>
  );
}

export default StarsBackground;
