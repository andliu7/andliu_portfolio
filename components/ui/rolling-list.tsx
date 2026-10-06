import type { HTMLAttributes, ReactNode } from 'react';

// RollingRow (SITE-PLAN.md 2.2, 4.5, 4.6), adapted in place from the saved rolling-list
// component. The demo items, the 21st.dev image URLs and next/image are gone (this is a static
// export, so images are plain <img>, and they belong to the caller). What stays is the mechanic:
//   - the title sits in a one-line mask holding two copies; on hover or focus the pair translates
//     -50%, so the second copy (by default the same title in --kw) rolls up into view, with the
//     saved 500ms cubic-bezier(.76,0,.24,1)
//   - the meta label (the saved "category") fades out
//   - an optional `aside` (the saved image reveal) goes from opacity 0, scale .95, rotate 3deg,
//     16px right, to rest; the caller decides what it holds and where it sits
// Used by the work index (an <a> per row) and the Impact accordion (a <button> per row).
// CSS: the .roll-* rules in app/globals.css. Reduced motion: no roll, the colour changes instead.
//
// A server component: pure markup, the motion is CSS.

type Props = HTMLAttributes<HTMLElement> & {
  /** The row element: 'a' (the default when href is set), 'button', or anything else. */
  as?: 'a' | 'button' | 'div' | 'li';
  href?: string;
  target?: string;
  rel?: string;
  type?: 'button';
  /** The title. */
  children: ReactNode;
  /** The second copy that rolls in; defaults to the same title. */
  alt?: ReactNode;
  /** A small label that fades out while the title rolls (the work index's kind). */
  meta?: ReactNode;
  /** Revealed on hover or focus (the work index's image card). Decorative: aria-hidden. */
  aside?: ReactNode;
  /** Placed before the title, not rolled (the row number). */
  lead?: ReactNode;
};

export function RollingRow({ as, href, children, alt, meta, aside, lead, className = '', ...props }: Props) {
  const Tag = as ?? (href ? 'a' : 'div');
  return (
    <Tag className={`roll-row ${className}`} href={href} {...props}>
      {lead}
      <span className="roll-mask">
        <span className="roll-track">
          <span className="roll-a">{children}</span>
          <span className="roll-b" aria-hidden="true">{alt ?? children}</span>
        </span>
      </span>
      {meta && <span className="roll-meta">{meta}</span>}
      {aside && <span className="roll-aside" aria-hidden="true">{aside}</span>}
    </Tag>
  );
}

export default RollingRow;
