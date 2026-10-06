// FlipLink, adapted from the saved flip-links component: the letters roll up and a second row
// rolls in from below, staggered 25ms per letter, on hover and on keyboard focus.
// Changes from the saved version (SITE-PLAN.md 2.2):
//   - the <a> carries aria-label, and both letter rows are aria-hidden, so a screen reader says
//     "GitHub" once instead of spelling it twice
//   - it also rolls on :focus-visible, not only :hover
//   - under html[data-motion="reduced"] nothing rolls
//   - external links open in a new tab with rel="noreferrer"
//   - styling is the .flip rules in app/globals.css (Stage tokens), not Tailwind demo classes
// A server component: pure markup, the motion is CSS transitions.

import type { CSSProperties } from 'react';

type Props = {
  href: string;
  children: string;
  external?: boolean;
  className?: string;
  /** Overrides the accessible name; defaults to the visible text. */
  label?: string;
};
// Far in-page targets need no onClick: the director's link delegate (app/motion.tsx) routes them.

export function FlipLink({ href, children, external = false, className = '', label }: Props) {
  const letters = Array.from(children);
  const row = (hiddenRow: boolean) => (
    <span className={hiddenRow ? 'flip-row flip-row-b' : 'flip-row flip-row-a'} aria-hidden="true">
      {letters.map((letter, i) => (
        <span key={i} className="flip-ch" style={{ '--i': i } as CSSProperties}>{letter === ' ' ? ' ' : letter}</span>
      ))}
    </span>
  );
  return (
    <a
      href={href}
      className={`flip ${className}`}
      aria-label={label ?? children}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : null)}
    >
      {row(false)}
      {row(true)}
    </a>
  );
}

export default FlipLink;
