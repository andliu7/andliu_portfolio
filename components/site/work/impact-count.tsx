'use client';
import { useEffect, useRef, useState } from 'react';
import { isReducedMotion } from '../use-reduced-motion';

// A project card's headline number (app/sections/projects.tsx, the .wk-imp block). It counts up
// from 0 each time its card becomes the fan's centre card, beside the graph that draws itself in.
//
// The server renders the final number, so the page is right with JavaScript off, under reduced
// motion, and on the side cards. The fan (components/ui/project-fan.tsx) marks the centre card
// with data-active and itself with data-in once it has come up; a MutationObserver (the browser
// telling us when an attribute changes) watches both, and one requestAnimationFrame loop runs the
// count, ease-out, 0.9s (the same curve as count-up.tsx, which plays once on scroll and so does
// not fit here). The visible digits are aria-hidden; screen readers get the final value once.

const fmt = (n: number) => n.toLocaleString('en-US');

export function ImpactCount({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const card = ref.current?.closest('.wk-fan-card');
    const fan = card?.closest('.wk-fan');
    if (!card || !fan) return;
    let frame = 0;
    let playing = false;
    const check = () => {
      const on = card.hasAttribute('data-active') && fan.hasAttribute('data-in') && !isReducedMotion();
      if (on === playing) return;
      playing = on;
      cancelAnimationFrame(frame);
      if (!on) { setShown(value); return; }
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 900);
        setShown(Math.round(value * (1 - (1 - t) ** 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      setShown(0);
      frame = requestAnimationFrame(tick);
    };
    const observer = new MutationObserver(check);
    observer.observe(card, { attributes: true, attributeFilter: ['data-active'] });
    observer.observe(fan, { attributes: true, attributeFilter: ['data-in'] });
    check();
    // Cleanup on unmount: stop watching and cancel a count in progress.
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);

  return (
    <span ref={ref}>
      <span className="sr-only">{fmt(value)}</span>
      <span aria-hidden="true">{fmt(shown)}</span>
    </span>
  );
}

export default ImpactCount;
