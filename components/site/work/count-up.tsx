'use client';
import { useEffect, useRef, useState } from 'react';
import { isReducedMotion } from '../use-reduced-motion';

// A number that counts up from 0 the first time it scrolls into view (SITE-PLAN.md 4.4, 0.9s).
//
// The server renders the final number, so the page is right with JavaScript off and under
// reduced motion. After hydration, if the number is still below the fold, it drops to 0 and an
// IntersectionObserver (the browser telling us when an element enters the screen) starts the
// count. One requestAnimationFrame loop per number, ease-out, then it stops for good.
// The visible digits are aria-hidden; screen readers get the final value once.

export function CountUp({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || isReducedMotion() || el.getBoundingClientRect().top < window.innerHeight) return;
    setShown(0);
    let frame = 0;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 900);
        setShown(Math.round(value * (1 - (1 - t) ** 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    observer.observe(el);
    // Cleanup on unmount: stop watching and cancel a count in progress.
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}

export default CountUp;
