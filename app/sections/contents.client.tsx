'use client';
import { useEffect, useState, type CSSProperties } from 'react';

// "WHERE TO?" rolls once when it first scrolls into view (Andrew 2026-10-06: "the where to needs
// the flipping text"). It borrows the director's tap state (app/motion.tsx): data-flipped on the
// heading's .flip-head for 900ms rolls every letter over and back, the same CSS as hover and focus
// (globals.css .flip-head). It also sets data-seen on the section, which plays the "Say hi" row's
// wave once (contents.css). Skipped under reduced motion. Renders nothing: a client component
// used only for its effect, so contents.tsx stays a server component.
export function FlipOnView({ id }: { id: string }) {
  useEffect(() => {
    const head = document.getElementById(id)?.querySelector<HTMLElement>('.flip-head');
    if (!head) return;
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (document.documentElement.getAttribute('data-motion') === 'reduced') return;
      head.setAttribute('data-flipped', '');
      head.closest('section')?.setAttribute('data-seen', '');
      timer = window.setTimeout(() => head.removeAttribute('data-flipped'), 900);
    }, { threshold: 1 });
    observer.observe(head);
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, [id]);
  return null;
}

// The compass in the Contents' top left corner (Andrew 2026-10-06: "the compass is good ... make
// it spin when clicked"). A real button: a click, Enter or Space spins the needle two whole turns
// plus a random heading, on a spring that overshoots and settles (contents.css .toc-compass).
// Reduced motion: a small instant turn instead. The drawing is aria-hidden; the button is named.
// Pattern: the needle's angle is React state; each press adds to it, so CSS transitions from the
// old angle to the new one (adding, never resetting, so it always spins forward).
const NS = 'non-scaling-stroke' as const;
const INK = '#12142b'; // the site's --ink (an SVG attribute cannot read a CSS variable)
const S = { stroke: INK, strokeWidth: 2, vectorEffect: NS, strokeLinejoin: 'round' as const };

export function CompassSpin({ label }: { label: string }) {
  const [angle, setAngle] = useState(0);
  const spin = () => {
    const still = document.documentElement.getAttribute('data-motion') === 'reduced';
    setAngle(a => a + (still ? 30 : 720 + Math.round(Math.random() * 360)));
  };
  return (
    <button type="button" className="toc-compass" aria-label={label} onClick={spin}>
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r="27" fill="#fbf8f1" {...S} />
        <circle cx="32" cy="32" r="21" fill="none" {...S} opacity=".35" />
        <path d="M32 3v5M32 56v5M3 32h5M56 32h5" fill="none" {...S} />
        <g className="toc-needle" style={{ '--a': `${angle}deg` } as CSSProperties}>
          <path d="M32 12l6 20H26z" fill="#F4A7B9" {...S} />
          <path d="M32 52l-6-20h12z" fill="#C9BEE3" {...S} />
        </g>
        <circle cx="32" cy="32" r="3" fill={INK} />
      </svg>
    </button>
  );
}
