import { Fragment, type CSSProperties } from 'react';

// Text split for the project fan's entrances (Andrew 2026-10-07: "text animation as it loads in").
//   Letters  each word is a mask (.wk-rw) and each letter (.wk-ch) rises out of it, staggered by
//            --i. A screen reader gets the plain text once; the letter stage is aria-hidden.
//   Words    each word is its own span (.wk-cw) with --i, for the caption's rise on change.
//            Real spaces sit between the spans, so the text wraps and reads as normal text.
// The motion itself is CSS in app/sections/projects.css. A server component: plain markup.

export function Letters({ text }: { text: string }) {
  let i = 0;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span className="wk-rise" aria-hidden="true">
        {text.split(' ').map((word, w) => (
          <Fragment key={w}>
            {w > 0 && ' '}
            <span className="wk-rw">
              {Array.from(word).map((char, c) => (
                <span key={c} className="wk-ch" style={{ '--i': i++ } as CSSProperties}>{char}</span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </>
  );
}

/** Words of `text` as spans numbered from `start`, so several paragraphs can share one stagger. */
export function Words({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <>
      {text.split(' ').map((word, w) => (
        <Fragment key={w}>
          {w > 0 && ' '}
          <span className="wk-cw" style={{ '--i': start + w } as CSSProperties}>{word}</span>
        </Fragment>
      ))}
    </>
  );
}

export const wordCount = (text: string) => text.split(' ').length;
