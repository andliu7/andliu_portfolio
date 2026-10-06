import { MARK } from '@/lib/site';
import { FlipStage } from './flip-heading';

// The AND/LIU mark: Andrew's handle, andliu, as "AND" over "LIU" in Fira Code 700, both lines
// the same size, so the two three-letter lines (Fira is monospaced) make a tight square block.
// LIU is berry. Used by the header wordmark and the footer's brand column; the CSS is .mark in
// app/globals.css. It is FlipStage underneath, so inside a .flip-head link (the header) the
// letters roll and the colours trade places on hover, exactly like a section heading.
// Decorative: the link around it carries the accessible name.

export function Mark({ className = '' }: { className?: string }) {
  return (
    <span className={`mark ${className}`.trim()}>
      <FlipStage text={`${MARK.top}\n${MARK.bottom}`} />
    </span>
  );
}
