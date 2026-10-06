import type { CSSProperties } from 'react';

// Display type helpers. All four are server components: plain markup, no state, no effects.
// Motion (letters rising, words lighting) is CSS and the sections' client enhancers.

/** The elements a display line may render as. A closed list, so TypeScript can check the props. */
export type TextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';

/**
 * One span per letter, each carrying its index as --i so CSS can stagger them. The heading
 * around it holds the real text for screen readers; these spans are aria-hidden by their parent.
 */
export function Letters({ text, start = 0 }: { text: string; start?: number }) {
  return <>{Array.from(text).map((char, i) => (
    <span key={i} className="ch" style={{ '--i': start + i } as CSSProperties}>{char === ' ' ? ' ' : char}</span>
  ))}</>;
}

/**
 * A heading whose lines rise letter by letter the first time it scrolls into view
 * ([data-reveal] is watched by app/motion.tsx). Screen readers get the sentence once, from the
 * sr-only span; the letter spans are hidden from them.
 */
export function SplitHeading({ id, lines, as: Tag = 'h2', className = '' }: { id?: string; lines: readonly string[]; as?: TextTag; className?: string }) {
  let start = 0;
  return <Tag id={id} className={`display split ${className}`} data-reveal>
    <span className="sr-only">{lines.join(' ')}</span>
    {lines.map((line, index) => {
      const node = <span className="line" aria-hidden="true" key={index}><Letters text={line} start={start} /></span>;
      start += line.length;
      return node;
    })}
  </Tag>;
}

// Splits "SELECTED *work.*" into [{ text: 'SELECTED ', kw: false }, { text: 'work.', kw: true }].
export function parseTwoVoice(text: string): { text: string; kw: boolean }[] {
  return text.split(/(\*[^*]+\*)/).filter(Boolean).map(part => (
    part.startsWith('*') && part.endsWith('*') ? { text: part.slice(1, -1), kw: true } : { text: part, kw: false }
  ));
}

/**
 * Lando's two voices in one line: Fira Code 700 caps for most words, Antic mixed case for the
 * *starred* keywords, in the ground's keyword colour (--kw). Each word is its own span (.w) so a
 * section can light words one by one as you scroll; keywords also get .kw.
 * The text stays real text, so screen readers read the sentence as written.
 */
export function TwoVoice({ text, as: Tag = 'h2', id, className = '', fit = false, max }: {
  text: string; as?: TextTag; id?: string; className?: string; fit?: boolean; max?: number;
}) {
  const parts = parseTwoVoice(text);
  const plain = parts.map(part => part.text).join('');
  const style = fit ? { '--chars': longestLine(plain), ...(max ? { '--max': `${max}px` } : null) } as CSSProperties : undefined;
  return <Tag id={id} className={`two-voice ${fit ? 'fit' : ''} ${className}`} style={style}>
    {parts.map((part, i) => {
      const words = part.text.split(/(\s+)/);
      return words.map((word, j) => (
        /^\s+$/.test(word) || word === '' ? word : <span key={`${i}-${j}`} className={part.kw ? 'w kw' : 'w'}>{word}</span>
      ));
    })}
  </Tag>;
}

/**
 * A display heading sized so its longest line fills the column: Fira Code is monospaced, so the
 * width follows from the character count (--chars) and .fit in globals.css does the maths in cqi.
 * `max` caps the size in px. Use \n in `text` for a line break.
 */
export function FitHeading({ text, as: Tag = 'h2', max, id, className = '' }: { text: string; as?: TextTag; max?: number; id?: string; className?: string }) {
  const lines = text.split('\n');
  const style = { '--chars': longestLine(text), ...(max ? { '--max': `${max}px` } : null) } as CSSProperties;
  return <Tag id={id} className={`display fit ${className}`} style={style}>
    {lines.map((line, i) => <span key={i} className="fit-line">{line}</span>)}
  </Tag>;
}

function longestLine(text: string) {
  return Math.max(1, ...text.split('\n').map(line => Array.from(line).length));
}
