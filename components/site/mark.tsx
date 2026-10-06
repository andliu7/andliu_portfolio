import { Fredoka } from 'next/font/google';
import { MARK } from '@/lib/site';
import { FlipStage } from './flip-heading';

// The AND/LIU mark: Andrew's handle, andliu, as "AND" over "LIU", both lines the same size and
// centred, in its own heavier display face (the rest of the site keeps Fira Code and Karla).
// LIU is berry. Used by the header wordmark and the footer's brand column; the CSS is .mark in
// app/globals.css. It is FlipStage underneath, so inside a .flip-head link (the header) the
// letters roll and the colours trade places on hover, exactly like a section heading.
// Decorative: the link around it carries the accessible name, and FlipStage is aria-hidden.
//
// The face: Fredoka 700, the rounded face of Andrew's andliu Play dialect. next/font loads it the
// way app/layout.tsx loads the others and puts it in --font-fredoka on this span; .mark reads it
// through one custom property, --mark-font. To try another face, load it here the same way and
// change that one line in globals.css.
const fredoka = Fredoka({ weight: '700', variable: '--font-fredoka', subsets: ['latin'], display: 'swap' });

export function Mark({ className = '' }: { className?: string }) {
  return (
    <span className={`mark ${fredoka.variable} ${className}`.trim()}>
      <FlipStage text={`${MARK.top}\n${MARK.bottom}`} />
    </span>
  );
}
