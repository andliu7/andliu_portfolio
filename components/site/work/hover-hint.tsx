'use client';
import { useEffect, useRef, useState } from 'react';

// The "hover!" sticker (Andrew 2026-10-06: "add a little 'hover!' icon"): a tilted tag with a
// curved arrow pointing down at the Selected work list (its rows preview on hover), bobbing gently, that tucks away for good
// after the first hover (or, on a touch screen, the first tap) on a row. Both words are in the
// markup; CSS (app/sections/projects.css, .wk-hint) shows "hover!" where hovering exists and
// "tap!" elsewhere, places it per width, and keeps it still under reduced motion. Decoration only
// (aria-hidden); the fan works without it.
// Pattern: useRef finds the sticker's own section; useEffect adds one 'pointerover' listener on
// `target` inside it ({ once: true } removes it after it fires; a tap fires it too) that flips
// `done`, which sets data-done.

export function HoverHint({ text, touchText, target }: { text: string; touchText: string; target: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const area = ref.current?.closest('.work')?.querySelector(target);
    if (!area) return;
    const hide = () => setDone(true);
    area.addEventListener('pointerover', hide, { once: true });
    return () => area.removeEventListener('pointerover', hide);
  }, [target]);

  return (
    <span ref={ref} className="wk-hint" data-done={done ? '' : undefined} aria-hidden="true">
      <span className="wk-hint-tag"><span className="wk-hint-hover">{text}</span><span className="wk-hint-tap">{touchText}</span></span>
      <svg className="wk-hint-arrow" viewBox="0 0 60 64">
        <path d="M54 4C52 30 36 46 14 54" />
        <path d="M26 56 14 54 20 43" />
      </svg>
    </span>
  );
}

export default HoverHint;
