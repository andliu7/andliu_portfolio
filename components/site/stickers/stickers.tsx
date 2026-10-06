import './stickers.css';

// Flat stickers of Andrew's things (the hero and dive collages): a blueberry, a molecule drawn
// as a skeletal structure, a flashcard, a barbell and a pan. Original art, flat fills from the
// site's :root tokens (the colours live in stickers.css, because an SVG fill attribute cannot
// read a CSS variable), every shape outlined in ink at 2px whatever the sticker's size
// (vector-effect="non-scaling-stroke").
//
// All decoration: each sticker is aria-hidden and has no text a screen reader would want. The
// caller positions and sizes them; width comes from the caller's CSS, height follows the viewBox.
// The blueberry is the one character: its eyes blink (stickers.css, .st-eyes) unless motion is
// reduced.

type Props = { className?: string };

const NS = 'non-scaling-stroke' as const;

// Blueberry's own mascot (grignard-app-source src/components/ui/blueberry-mark.tsx), redrawn
// flat for the collage: the same 64-unit body (r 23 at 32,34), the five-petal calyx squashed to
// lie on the sphere, the soft shine high on the left, tall dark eyes set wide with a catchlight
// high on the left, faint blush under them and a shallow smile. Flat fills instead of the
// mark's gradients (Slush: no gradients); the only outline is the silhouette, never the face.
export function BlueberrySticker({ className = '' }: Props) {
  const petal = 'M0 -11 C2.8 -6.7 3.7 -2.8 2.6 0 C1.6 2.2 -1.6 2.2 -2.6 0 C-3.7 -2.8 -2.8 -6.7 0 -11 Z';
  return (
    <svg className={`st st-berry ${className}`} viewBox="7 6 50 52" aria-hidden="true" focusable="false">
      <circle className="st-berry-body" vectorEffect={NS} cx="32" cy="34" r="23" />
      <ellipse className="st-berry-shine" cx="19" cy="26" rx="6" ry="4.1" transform="rotate(-30 19 26)" />
      <g className="st-crown" transform="translate(32 15.5) scale(1 0.62)">
        {[0, 72, 144, 216, 288].map(turn => <path key={turn} d={petal} transform={`rotate(${turn})`} />)}
        <circle className="st-crown-eye" r="3.6" />
      </g>
      <g className="st-blush">
        <ellipse cx="19.5" cy="40" rx="4.2" ry="2.6" />
        <ellipse cx="44.5" cy="40" rx="4.2" ry="2.6" />
      </g>
      <g className="st-eyes">
        <ellipse className="st-pupil" cx="23.5" cy="33" rx="3.2" ry="5.7" />
        <ellipse className="st-pupil" cx="40.5" cy="33" rx="3.2" ry="5.7" />
        <ellipse className="st-glint" cx="22.4" cy="30.4" rx="1" ry="1.5" />
        <ellipse className="st-glint" cx="39.4" cy="30.4" rx="1" ry="1.5" />
      </g>
      <path className="st-smile" d="M26.5 42.4 Q32 46.2 37.5 42.4" />
    </svg>
  );
}

// Acetophenone in skeletal form: a benzene ring (alternate inner bonds), the carbonyl carbon off
// one vertex with its C=O, and a methyl stub. The badge is centred on the whole molecule's
// bounding box (x -12.1 to 36.4, y -36 to 14, centre 12.1,-11), not on the ring, with 8 units of
// even padding, so the substituent sits inside the frame.
export function MoleculeSticker({ className = '' }: Props) {
  return (
    <svg className={`st st-mol ${className}`} viewBox="-28 -51 80 80" aria-hidden="true" focusable="false">
      <circle className="st-mol-badge" vectorEffect={NS} cx="12.1" cy="-11" r="38" />
      <g className="st-bonds" fill="none">
        <path vectorEffect={NS} d="M0 -14 L12.1 -7 L12.1 7 L0 14 L-12.1 7 L-12.1 -7 Z" />
        <path vectorEffect={NS} d="M8.7 -3 L8.7 3 M-1.7 9.1 L-7 6 M-7 -6 L-1.7 -9.1" />
        <path vectorEffect={NS} d="M12.1 -7 L24.2 -14 L36.4 -7" />
        <path vectorEffect={NS} d="M24.2 -14 V-24.5 M27.4 -16 V-24" />
      </g>
      <text className="st-oxygen" x="24.2" y="-30" textAnchor="middle" dominantBaseline="central">O</text>
    </svg>
  );
}

// Two cards, the back one peeking out; the front one has two text bars and a curved
// arrow-pushing arrow, the mark of a mechanism card.
export function FlashcardSticker({ className = '' }: Props) {
  return (
    <svg className={`st st-card ${className}`} viewBox="0 0 140 100" aria-hidden="true" focusable="false">
      <rect className="st-card-back" vectorEffect={NS} x="20" y="6" width="112" height="76" rx="12" />
      <rect className="st-card-front" vectorEffect={NS} x="8" y="18" width="112" height="76" rx="12" />
      <rect className="st-card-bar" x="22" y="34" width="54" height="7" rx="3.5" />
      <rect className="st-card-bar st-card-bar-2" x="22" y="48" width="36" height="7" rx="3.5" />
      <path className="st-arrow" vectorEffect={NS} d="M30 78c10-14 40-16 56-4" fill="none" />
      <path className="st-arrow-head" vectorEffect={NS} d="M80 66l9 10-13 2z" />
    </svg>
  );
}

export function BarbellSticker({ className = '' }: Props) {
  return (
    <svg className={`st st-bar ${className}`} viewBox="0 0 160 70" aria-hidden="true" focusable="false">
      <rect className="st-bar-rod" vectorEffect={NS} x="6" y="31" width="148" height="8" rx="4" />
      <rect className="st-plate" vectorEffect={NS} x="22" y="6" width="16" height="58" rx="6" />
      <rect className="st-plate st-plate-2" vectorEffect={NS} x="40" y="15" width="12" height="40" rx="5" />
      <rect className="st-plate" vectorEffect={NS} x="122" y="6" width="16" height="58" rx="6" />
      <rect className="st-plate st-plate-2" vectorEffect={NS} x="108" y="15" width="12" height="40" rx="5" />
    </svg>
  );
}

// A pan with a fried egg, seen from above.
export function PanSticker({ className = '' }: Props) {
  return (
    <svg className={`st st-pan ${className}`} viewBox="0 0 160 110" aria-hidden="true" focusable="false">
      <path className="st-pan-handle" vectorEffect={NS} d="M98 50l54-12a6 6 0 0 1 3 12l-54 12z" />
      <circle className="st-pan-body" vectorEffect={NS} cx="56" cy="56" r="50" />
      <circle className="st-pan-inner" cx="56" cy="56" r="40" />
      <path className="st-egg" vectorEffect={NS} d="M34 50c2-16 22-22 34-14 14-2 20 14 12 24 4 14-14 22-26 16-14 4-26-8-20-26z" />
      <circle className="st-yolk" vectorEffect={NS} cx="56" cy="56" r="11" />
    </svg>
  );
}

// The big motif that sits behind the hero's type (Slush puts one large shape behind the
// headline): a flat blueberry, no face, so it reads as ground rather than a second character.
export function BerryMotif({ className = '' }: Props) {
  return (
    <svg className={`st st-motif ${className}`} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <circle className="st-motif-body" vectorEffect={NS} cx="100" cy="104" r="92" />
      <path className="st-motif-shine" d="M38 78c10-26 32-44 58-48" fill="none" />
      <g className="st-motif-crown" transform="translate(100 18) scale(1.6 1)">
        {[0, 72, 144, 216, 288].map(turn => <path key={turn} d="M0 -11 C2.8 -6.7 3.7 -2.8 2.6 0 C1.6 2.2 -1.6 2.2 -2.6 0 C-3.7 -2.8 -2.8 -6.7 0 -11 Z" transform={`rotate(${turn})`} />)}
      </g>
    </svg>
  );
}

// A sprig: one curved stem with five leaves (the off-the-clock "faith" sticker, a quiet thing
// that grows).
export function SprigSticker({ className = '' }: Props) {
  const leaf = 'M0 0 C6 -8 18 -8 22 0 C18 8 6 8 0 0 Z';
  return (
    <svg className={`st st-sprig ${className}`} viewBox="0 0 100 120" aria-hidden="true" focusable="false">
      <path className="st-sprig-stem" vectorEffect={NS} d="M30 114 C40 80 52 50 74 10" fill="none" />
      <path className="st-sprig-leaf" vectorEffect={NS} d={leaf} transform="translate(36 90) rotate(-160)" />
      <path className="st-sprig-leaf" vectorEffect={NS} d={leaf} transform="translate(40 80) rotate(-20)" />
      <path className="st-sprig-leaf" vectorEffect={NS} d={leaf} transform="translate(50 56) rotate(-170)" />
      <path className="st-sprig-leaf" vectorEffect={NS} d={leaf} transform="translate(55 48) rotate(-30)" />
      <path className="st-sprig-leaf" vectorEffect={NS} d={leaf} transform="translate(70 18) rotate(-70)" />
    </svg>
  );
}
