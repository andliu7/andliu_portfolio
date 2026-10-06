import type { CSSProperties } from 'react';
import { parseTwoVoice } from './type';

// FlipHeading (SITE-PLAN.md 2.2, A3): every section's display header is a link to its own
// section, and its two voices trade places when you touch it. Built from the mechanics of
// components/ui/flip-links.tsx (a second row rolls in per letter, staggered) and
// components/ui/rolling-list.tsx (each cell holds two copies and translates -50% to the second,
// with rolling-list's cubic-bezier(.76,0,.24,1) over 500ms).
//
// Each letter is its own cell, so the heading wraps like normal text and the rows can never
// drift apart: Fira Code is monospaced, so a letter's two faces are the same width.
//   Fira letters:     row 1 as set, row 2 the same glyph in --kw
//   Antic keyword:    one cell for the whole keyword; row 2 is the keyword in Fira 700 caps in --on
// Triggers (CSS in app/globals.css, .flip-head): :hover with a fine pointer, :focus-visible, and
// a tap or Enter, which the director (app/motion.tsx) turns into data-flipped for 900ms.
// Reduced motion: no roll; the colours swap instantly instead.
//
// A server component: plain markup, the motion is CSS. Screen readers read the sr-only text once;
// the letter stage is aria-hidden.

type Level = 'h1' | 'h2' | 'h3';

/**
 * The aria-hidden two-row letter stage for a two-voice string ("SELECTED *work.*"). A "\n" in
 * the text starts a new line. Exported for the header wordmark, which flips the same way.
 */
export function FlipStage({ text }: { text: string }) {
  let i = 0;
  return (
    <span className="fh-stage" aria-hidden="true">
      {text.split('\n').map((line, l) => (
        <span className="fh-line" key={l}>
          {parseTwoVoice(line).map((part, p) => {
            if (part.kw) {
              const cell = (
                <span className="fh-cell fh-kw" key={p} style={{ '--i': i } as CSSProperties}>
                  <span className="fh-roll">
                    <span className="fh-face fh-a"><span className="fh-kw-text">{part.text}</span></span>
                    <span className="fh-face fh-b">{part.text}</span>
                  </span>
                </span>
              );
              i += 1;
              return cell;
            }
            // Words stay unbroken (.fh-word is nowrap); the spaces between them are where lines wrap.
            return part.text.split(/(\s+)/).map((word, w) => {
              if (word === '') return null;
              if (/^\s+$/.test(word)) return ' ';
              return (
                <span className="fh-word" key={`${p}-${w}`}>
                  {Array.from(word).map((char, c) => {
                    const cell = (
                      <span className="fh-cell" key={c} style={{ '--i': i } as CSSProperties}>
                        <span className="fh-roll">
                          <span className="fh-face fh-a">{char}</span>
                          <span className="fh-face fh-b">{char}</span>
                        </span>
                      </span>
                    );
                    i += 1;
                    return cell;
                  })}
                </span>
              );
            });
          })}
        </span>
      ))}
    </span>
  );
}

/** The heading's plain sentence: keywords unstarred, line breaks as spaces. */
export function plainText(text: string) {
  return text.split('\n').map(line => parseTwoVoice(line).map(part => part.text).join('')).join(' ').replace(/\s+/g, ' ').trim();
}

export function FlipHeading({ id, text, as: Tag = 'h2', href, max, fit = true, className = '' }: {
  /** The heading's id; the link targets `#id` unless `href` says otherwise. */
  id: string;
  /** Two-voice text from lib/site.ts, keywords in *asterisks*, "\n" for a line break. */
  text: string;
  as?: Level;
  href?: string;
  /** Caps the .fit size in px. */
  max?: number;
  /** Size the longest line to the column (.fit). Off for small headings such as card titles. */
  fit?: boolean;
  className?: string;
}) {
  const plain = plainText(text);
  const longest = Math.max(1, ...text.split('\n').map(line => plainText(line).length));
  const style = fit ? { '--chars': longest, ...(max ? { '--max': `${max}px` } : null) } as CSSProperties : undefined;
  return (
    <Tag id={id} className={`flip-heading ${fit ? 'fit' : ''} ${className}`} style={style}>
      <a className="flip-head" href={href ?? `#${id}`}>
        <span className="sr-only">{plain}</span>
        <FlipStage text={text} />
      </a>
    </Tag>
  );
}

export default FlipHeading;
