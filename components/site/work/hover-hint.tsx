'use client';
import { useEffect, useRef, useState } from 'react';

// The "hover!" sticker over the work index (Andrew 2026-10-06: "add a little 'hover!' icon"):
// a tilted tag with a curved arrow pointing down at the rows, bobbing gently, that tucks away for
// good after the first hover on any row. Decoration only (aria-hidden); the rows work without it.
// CSS (in app/sections/projects.css, .wk-hint) hides it where there is no hover, and keeps it still
// under reduced motion.
// Pattern: useRef finds the sticker's own section; useEffect adds one 'pointerover' listener
// ({ once: true } removes it after it fires) that flips `done`, which sets data-done.

export function HoverHint({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const index = ref.current?.closest('.work')?.querySelector('.wk-index');
    if (!index) return;
    const hide = () => setDone(true);
    index.addEventListener('pointerover', hide, { once: true });
    return () => index.removeEventListener('pointerover', hide);
  }, []);

  return (
    <span ref={ref} className="wk-hint" data-done={done ? '' : undefined} aria-hidden="true">
      <span className="wk-hint-tag">{text}</span>
      <svg className="wk-hint-arrow" viewBox="0 0 60 48">
        <path d="M50 4C50 24 34 36 12 38" />
        <path d="M20 30 10 38 20 45" />
      </svg>
    </span>
  );
}

export default HoverHint;
