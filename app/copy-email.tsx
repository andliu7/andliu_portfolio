'use client';
import { useState, type CSSProperties } from 'react';
import { Check, Copy } from 'lucide-react';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// The copy button: it says "Copied" for two seconds and, unless motion is reduced, throws a small
// burst of confetti (Andrew 2026-10-07: "make a confetti celebration when you copy the email").
// The burst is a few dozen spans, each given its own direction, spin and colour as CSS variables
// at click time; one CSS keyframe (ct-confetti in app/sections/contact.css) flies them out and
// down, and they are removed after 1.2s. Its styles live there because Contact is its only user.
// The spans sit in a wrapper beside the button, since the pill clips what overflows it.

type Piece = { dx: number; dy: number; r: number; c: string; w: number };
const COLOURS = ['var(--berry)', 'var(--sky)', 'var(--tile-pink)', 'var(--tile-leaf)', 'var(--tile-gold)', 'var(--card)'];

function makeBurst(): Piece[] {
  return Array.from({ length: 32 }, (_, i) => {
    const angle = (-90 + (Math.random() * 2 - 1) * 75) * (Math.PI / 180); // mostly upward
    const dist = 70 + Math.random() * 90;
    return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, r: (Math.random() * 2 - 1) * 540, c: COLOURS[i % COLOURS.length], w: 6 + Math.random() * 5 };
  });
}

export default function CopyEmail({ email }: { email: string }) {
  const reduced = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState<Piece[] | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      if (!reduced) {
        setBurst(makeBurst());
        window.setTimeout(() => setBurst(null), 1200);
      }
    } catch {
      window.location.href = `mailto:${email}`; // no clipboard access: open the mail app instead
    }
  };
  return (
    <span className="copy-wrap">
      <button type="button" className="pill pill-light copy-email" onClick={copy} aria-live="polite">
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy email'}
      </button>
      {burst && (
        <span className="ct-confetti" aria-hidden="true">
          {burst.map((p, i) => (
            <i key={i} style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--r': `${p.r}deg`, '--c': p.c, '--w': `${p.w}px` } as CSSProperties} />
          ))}
        </span>
      )}
    </span>
  );
}
