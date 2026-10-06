import type { CSSProperties, JSX } from 'react';

// Flat, original drawings for the work act (style pass 2026-10-06): the check sticker (the
// blueberry, molecule and flashcard stickers are the shared ones in components/site/stickers),
// and three illustration cards for the projects that have no screenshot
// (Flashcards, Second Brain until its shot is approved, the animation pipeline). Every one is
// decoration, so each svg is aria-hidden; the words around it carry the meaning.
//
// Colours come from the site tokens through `style` (var() inside a presentation attribute is
// not reliable in every browser, inside style it is). Strokes are ink at 3px, the sticker weight.
// A server component: plain markup.

type Tone = 'ink' | 'paper' | 'card' | 'berry' | 'berry-deep' | 'berry-soft' | 'apricot' | 'sky' | 'line'
  | 'tile-apricot' | 'tile-leaf' | 'tile-gold' | 'tile-teal' | 'tile-pink' | 'tile-violet';

/** Fill with a token, optionally outlined in ink. */
const paint = (fill: Tone | 'none', stroke = true, width = 3): CSSProperties => ({
  fill: fill === 'none' ? 'none' : `var(--${fill})`,
  ...(stroke ? { stroke: 'var(--ink)', strokeWidth: width, strokeLinejoin: 'round', strokeLinecap: 'round' } : null),
});
const ink = paint('ink', false);

// ---------------------------------------------------------------------------------------------
// Stickers. Each has an "extruded edge": the same shape in ink, 6px lower, so it reads as a
// thick die-cut vinyl sticker (the Slush sticker treatment, drawn new).
// ---------------------------------------------------------------------------------------------

export function CheckSticker({ className = '' }: { className?: string }) {
  return (
    <svg className={`sticker ${className}`} viewBox="0 0 100 104" aria-hidden="true">
      <circle cx="50" cy="56" r="42" style={ink} />
      <circle cx="50" cy="50" r="42" style={paint('tile-leaf')} />
      <path d="M31 51 45 65 70 38" style={{ ...paint('none'), strokeWidth: 8 }} />
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Illustration cards, 800x500 (the screenshots' 16:10), for projects without a screenshot.
// ---------------------------------------------------------------------------------------------

/** A benzene ring with one pendant bond and an atom: Blueberry's drawing, simplified. */
function Ring({ x, y, r, atom }: { x: number; y: number; r: number; atom: Tone }) {
  const h = r * 0.866;
  const pts = [[0, -r], [h, -r / 2], [h, r / 2], [0, r], [-h, r / 2], [-h, -r / 2]].map(([a, b]) => `${x + a},${y + b}`).join(' ');
  const k = 0.74;
  return (
    <g>
      <polygon points={pts} style={paint('none')} />
      <path d={`M${x} ${y - r * k} ${x + h * k} ${y - (r / 2) * k}M${x + h * k} ${y + (r / 2) * k} ${x} ${y + r * k}M${x - h * k} ${y + (r / 2) * k}V${y - (r / 2) * k}M${x + h} ${y - r / 2} ${x + h + r * 0.8} ${y - r}`} style={paint('none')} />
      <circle cx={x + h + r * 0.8 + 8} cy={y - r - 5} r={r * 0.3} style={paint(atom)} />
    </g>
  );
}

/** Flashcards: a deck fanned out, the front card showing a structure, and the self-rating row. */
export function FlashcardsArt() {
  return (
    <svg className="art" viewBox="0 0 800 500" aria-hidden="true">
      <rect width="800" height="500" style={paint('card', false)} />
      <rect x="250" y="70" width="300" height="200" rx="22" transform="rotate(-9 400 170)" style={paint('berry-soft')} />
      <rect x="250" y="70" width="300" height="200" rx="22" transform="rotate(6 400 170)" style={paint('apricot')} />
      <rect x="250" y="70" width="300" height="200" rx="22" style={paint('paper')} />
      <Ring x={335} y={180} r={42} atom="berry" />
      <rect x="420" y="130" width="96" height="12" rx="6" style={ink} />
      <rect x="420" y="160" width="80" height="10" rx="5" style={{ ...ink, opacity: 0.3 }} />
      <rect x="420" y="184" width="64" height="10" rx="5" style={{ ...ink, opacity: 0.3 }} />
      <rect x="250" y="320" width="92" height="40" rx="20" style={paint('tile-pink')} />
      <rect x="354" y="320" width="92" height="40" rx="20" style={paint('tile-gold')} />
      <rect x="458" y="320" width="92" height="40" rx="20" style={paint('tile-leaf')} />
      <rect x="250" y="400" width="300" height="14" rx="7" style={paint('line', false)} />
      <rect x="250" y="400" width="180" height="14" rx="7" style={paint('berry', false)} />
    </svg>
  );
}

// Second Brain: memories as dots. A grid of faint dots, a few of them memories (bigger, filled,
// outlined), some linked, and one ringed the way a search finds it. Fixed positions, no random.
const MEMORIES: readonly [number, number, Tone][] = [
  [2, 1, 'apricot'], [5, 2, 'tile-teal'], [3, 4, 'tile-pink'], [8, 1, 'tile-gold'], [9, 4, 'berry'],
  [11, 2, 'tile-leaf'], [6, 6, 'tile-violet'], [12, 6, 'apricot'], [1, 6, 'sky'], [7, 3, 'berry-soft'],
];
const LINKS: readonly [number, number][] = [[0, 1], [1, 9], [9, 4], [4, 5], [2, 9], [6, 4], [4, 7], [3, 5]];
const at = (c: number, r: number) => [85 + c * 48, 80 + r * 48] as const;

export function BrainArt() {
  const dots = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 14; c++) {
    const [x, y] = at(c, r);
    dots.push(<circle key={`${c}-${r}`} cx={x} cy={y} r="5" style={paint('line', false)} />);
  }
  return (
    <svg className="art" viewBox="0 0 800 500" aria-hidden="true">
      <rect width="800" height="500" style={paint('card', false)} />
      {dots}
      {LINKS.map(([a, b]) => {
        const [x1, y1] = at(MEMORIES[a][0], MEMORIES[a][1]);
        const [x2, y2] = at(MEMORIES[b][0], MEMORIES[b][1]);
        return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} style={paint('none')} />;
      })}
      {MEMORIES.map(([c, r, tone]) => {
        const [x, y] = at(c, r);
        return <circle key={`${c}-${r}`} cx={x} cy={y} r="15" style={paint(tone)} />;
      })}
      <circle cx={at(9, 4)[0]} cy={at(9, 4)[1]} r="34" style={{ ...paint('none'), stroke: 'var(--berry)', strokeDasharray: '8 9' }} />
    </svg>
  );
}

/** The animation pipeline: a film strip of three reaction frames, the arrow moving the electrons. */
export function StudioArt() {
  const holes = [];
  for (let x = 60; x < 740; x += 44) {
    holes.push(<rect key={`t${x}`} x={x} y="96" width="20" height="14" rx="4" style={paint('card', false)} />);
    holes.push(<rect key={`b${x}`} x={x} y="370" width="20" height="14" rx="4" style={paint('card', false)} />);
  }
  const frames = [0, 1, 2].map(i => 74 + i * 222);
  return (
    <svg className="art" viewBox="0 0 800 500" aria-hidden="true">
      <rect width="800" height="500" style={paint('card', false)} />
      <rect x="40" y="80" width="720" height="320" rx="20" style={ink} />
      {holes}
      {frames.map((fx, i) => (
        <g key={fx}>
          <rect x={fx} y="130" width="208" height="220" rx="12" style={paint(i === 1 ? 'sky' : 'paper')} />
          <Ring x={fx + 84} y={250} r={36} atom={i === 2 ? 'tile-leaf' : 'apricot'} />
          {i === 1 && <path d={`M${fx + 40} 190 Q${fx + 100} 140 ${fx + 150} 182`} style={{ ...paint('none', true, 5), stroke: 'var(--berry)' }} />}
          {i === 1 && <polygon points={`${fx + 150},182 ${fx + 136},180 ${fx + 148},168`} style={{ fill: 'var(--berry)', stroke: 'var(--berry)', strokeWidth: 3, strokeLinejoin: 'round' }} />}
        </g>
      ))}
      <circle cx="712" cy="438" r="40" style={paint('apricot')} />
      <polygon points="700,418 734,438 700,458" style={paint('ink', true, 2)} />
    </svg>
  );
}

/** The drawing for a project with no screenshot, by PROJECTS id. */
export const PROJECT_ART: Partial<Record<string, () => JSX.Element>> = {
  flashcards: FlashcardsArt,
  brain: BrainArt,
  studio: StudioArt,
};
