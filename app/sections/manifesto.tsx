import type { CSSProperties, ReactNode } from 'react';
import { MANIFESTO, sectionAttrs } from '@/lib/site';
import { parseTwoVoice } from '@/components/site/type';
import { BarbellSticker, BlueberrySticker, FlashcardSticker, PanSticker, SprigSticker } from '@/components/site/stickers/stickers';
import { ForkSwitch } from './manifesto.client';
import './manifesto.css';

// The manifesto and the on/off switch (SITE-PLAN.md 4.2), as one Slush band on apricot:
//   1. the sentence as a crushed display-face poster. Its three *keywords* are each a different sticker:
//      the first on an outlined pill, the second over a hand-drawn swash, the third in the accent
//      voice. Small stickers sit tucked between words. Word by word it rises with the spring when
//      it scrolls in (manifesto.css; the director in app/motion.tsx adds .is-in to data-reveal).
//   2. one big switch, ON or OFF THE CLOCK, with a card beside it that swaps (manifesto.client.tsx).
//   3. a sticker ribbon across the foot of the band.
// Screen readers get the sentence once, from the sr-only plain text; the poster is aria-hidden.

// Which sticker sits after which word (word index in the sentence, counting from 0; the comma
// and the full stop count as words)
const TUCKED: Record<number, { Art: (props: { className?: string }) => ReactNode; r: number }> = {
  7: { Art: FlashcardSticker, r: 8 }, // after EASIER
  14: { Art: BlueberrySticker, r: -6 }, // after ACTUALLY
};
const KEYWORD_STYLE = ['pill', 'swash', 'voice'] as const;

type Token = { text: string; kw: number | null; space: boolean };

/** The sentence as words, each knowing whether it is a keyword and whether a space comes before it. */
function tokens(text: string): Token[] {
  const out: Token[] = [];
  let kw = 0;
  for (const part of parseTwoVoice(text)) {
    if (part.kw) { out.push({ text: part.text, kw: kw++, space: out.length > 0 }); continue; }
    let space = false;
    part.text.split(/(\s+)/).forEach((word, i) => {
      if (word === '') return;
      if (/^\s+$/.test(word)) { space = true; return; }
      // punctuation straight after a keyword (", FOR") joins it with no space
      out.push({ text: word, kw: null, space: out.length > 0 && (space || i > 0) });
      space = false;
    });
  }
  return out;
}

function Swash() {
  return (
    <svg className="mf-swash" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M8 28 C48 10 96 34 140 18 C160 12 178 14 192 20" />
    </svg>
  );
}

function Word({ token, i }: { token: Token; i: number }) {
  const style = { '--i': i } as CSSProperties;
  if (token.kw === null) return <span className="mf-w" style={style}>{token.text}</span>;
  const kind = KEYWORD_STYLE[token.kw % KEYWORD_STYLE.length];
  return (
    <span className={`mf-w mf-kw mf-kw-${kind}`} style={style}>
      {kind === 'pill' ? <span className="mf-pill" /> : null}
      {kind === 'swash' ? <Swash /> : null}
      {token.text}
    </span>
  );
}

const RIBBON = [BlueberrySticker, FlashcardSticker, PanSticker, BarbellSticker, SprigSticker];

export default function Manifesto() {
  const words = tokens(MANIFESTO.text);
  return (
    <section {...sectionAttrs('manifesto')} className="manifesto curve-top" aria-labelledby="manifesto-title">
      <div className="mf-inner">
        <span className="mf-tag">{MANIFESTO.eyebrow}</span>
        <h2 id="manifesto-title" className="mf-text" data-reveal>
          <span className="sr-only">{MANIFESTO.plain}</span>
          <span className="mf-lines" aria-hidden="true">
            {words.map((token, i) => {
              const tucked = TUCKED[i];
              return (
                <span key={i}>
                  {token.space ? ' ' : null}
                  <Word token={token} i={i} />
                  {tucked ? <>{' '}<span className="mf-ist" style={{ '--i': i, '--r': `${tucked.r}deg` } as CSSProperties}><tucked.Art /></span></> : null}
                </span>
              );
            })}
          </span>
        </h2>
        <ForkSwitch />
      </div>
      <div className="mf-ribbon" aria-hidden="true">
        {/* The globals .mq rules: two copies, each moving a full width, so the loop has no seam;
            under reduced motion the copy hides and the strip stands still. */}
        <div className="mq" data-direction="right" style={{ '--mq-duration': '40s' } as CSSProperties}>
          {[false, true].map(clone => (
            <div className="mq-track" key={String(clone)} data-clone={clone ? '' : undefined}>
              {[0, 1, 2].map(n => (
                <span className="mf-rib-item" key={n}>{RIBBON.map((Art, a) => <Art key={a} />)}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
