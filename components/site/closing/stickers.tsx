import './stickers.css';

// The closing sections' extra stickers, drawn to match the shared set in
// components/site/stickers/stickers.tsx (same .st base: flat token fills, 2px ink outline that
// never scales). The pan and barbell come from that shared set so the page has one of each;
// these add what it lacks, mostly for Off the clock's evening strip: a plant in a pot (landscape
// design and the garden line), a clock and a sparkle (the intro), a backpack (after work or
// classes), a table with two of the island's round people (eat), an open book (Bible study), and
// the sun and moon that ride the strip's arc. Fills live in ./stickers.css: an SVG fill attribute
// cannot read a CSS variable everywhere.
// All decoration: aria-hidden, no text.

type Props = { className?: string };

const NS = 'non-scaling-stroke' as const;

export function PotSticker({ className = '' }: Props) {
  return (
    <svg className={`st cl-sprig ${className}`} viewBox="0 0 120 140" aria-hidden="true" focusable="false">
      <path className="cl-stem" vectorEffect={NS} d="M60 96C60 70 56 46 64 18" />
      <path className="cl-leaf" vectorEffect={NS} d="M61 70c-18 2-30-8-32-22 16-2 30 6 32 22z" />
      <path className="cl-leaf" vectorEffect={NS} d="M62 52c16-2 28-14 28-28-16 0-28 10-28 28z" />
      <path className="cl-leaf cl-leaf-2" vectorEffect={NS} d="M63 30c-12-2-20-12-18-24 12 2 20 10 18 24z" />
      <path className="cl-pot" vectorEffect={NS} d="M30 94h60l-8 40H38z" />
      <rect className="cl-pot-rim" vectorEffect={NS} x="26" y="88" width="68" height="14" rx="6" />
    </svg>
  );
}

// A clock face, hands at five past six.
export function ClockSticker({ className = '' }: Props) {
  return (
    <svg className={`st cl-clock ${className}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <circle className="cl-clock-rim" vectorEffect={NS} cx="60" cy="60" r="52" />
      <circle className="cl-clock-face" vectorEffect={NS} cx="60" cy="60" r="40" />
      {[0, 90, 180, 270].map(a => <rect key={a} className="cl-tick" x="58" y="24" width="4" height="9" rx="2" transform={`rotate(${a} 60 60)`} />)}
      <path className="cl-hands" d="M60 60V34M60 60l14 20" />
      <circle className="cl-pin" vectorEffect={NS} cx="60" cy="60" r="5" />
    </svg>
  );
}

export function SparkleSticker({ className = '' }: Props) {
  return (
    <svg className={`st cl-sparkle ${className}`} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <path vectorEffect={NS} d="M40 4c4 22 14 32 36 36-22 4-32 14-36 36-4-22-14-32-36-36 22-4 32-14 36-36z" />
    </svg>
  );
}

// A backpack, flap closed: work or classes, done for the day.
export function BackpackSticker({ className = '' }: Props) {
  return (
    <svg className={`st cl-pack ${className}`} viewBox="0 0 120 140" aria-hidden="true" focusable="false">
      <path className="cl-pack-strap" vectorEffect={NS} d="M44 30c0-22 32-22 32 0" />
      <rect className="cl-pack-body" vectorEffect={NS} x="18" y="26" width="84" height="108" rx="26" />
      <path className="cl-pack-flap" vectorEffect={NS} d="M18 58c0-20 12-32 42-32s42 12 42 32v6H18z" />
      <rect className="cl-pack-pocket" vectorEffect={NS} x="34" y="86" width="52" height="34" rx="12" />
      <rect className="cl-pack-tab" vectorEffect={NS} x="53" y="58" width="14" height="14" rx="4" />
    </svg>
  );
}

// A table with two of the island's round people at it (capsule bodies, two dot eyes), a plate
// between them. "People at the table", drawn the way the island draws its crowd.
export function TableSticker({ className = '' }: Props) {
  return (
    <svg className={`st cl-table ${className}`} viewBox="0 0 180 130" aria-hidden="true" focusable="false">
      <g className="cl-blob cl-blob-a">
        <rect className="cl-blob-body" vectorEffect={NS} x="14" y="20" width="44" height="70" rx="22" />
        <circle className="cl-eye" cx="30" cy="42" r="3.2" /><circle className="cl-eye" cx="44" cy="42" r="3.2" />
      </g>
      <g className="cl-blob cl-blob-b">
        <rect className="cl-blob-body" vectorEffect={NS} x="122" y="14" width="44" height="76" rx="22" />
        <circle className="cl-eye" cx="136" cy="38" r="3.2" /><circle className="cl-eye" cx="150" cy="38" r="3.2" />
      </g>
      <rect className="cl-table-top" vectorEffect={NS} x="4" y="78" width="172" height="16" rx="6" />
      <path className="cl-table-leg" vectorEffect={NS} d="M24 94v32M156 94v32" />
      <ellipse className="cl-plate" vectorEffect={NS} cx="90" cy="76" rx="30" ry="8" />
      <ellipse className="cl-plate-food" vectorEffect={NS} cx="90" cy="72" rx="16" ry="6" />
    </svg>
  );
}

// An open book, a ribbon down the middle: the Bible study.
export function BookSticker({ className = '' }: Props) {
  return (
    <svg className={`st cl-book ${className}`} viewBox="0 0 160 110" aria-hidden="true" focusable="false">
      <path className="cl-book-cover" vectorEffect={NS} d="M6 24l74 10 74-10v76l-74 8-74-8z" />
      <path className="cl-book-page" vectorEffect={NS} d="M14 16c26-4 48 0 66 14v70c-18-12-40-16-66-12z" />
      <path className="cl-book-page" vectorEffect={NS} d="M146 16c-26-4-48 0-66 14v70c18-12 40-16 66-12z" />
      <path className="cl-book-lines" vectorEffect={NS} d="M28 36c14-2 28 0 40 6M28 52c14-2 28 0 40 6M92 42c12-6 26-8 40-6M92 58c12-6 26-8 40-6" />
      <path className="cl-book-ribbon" vectorEffect={NS} d="M80 30v84l-6-8-6 8V36" />
    </svg>
  );
}

// The sun and the moon that ride the evening strip's arc.
export function SunSticker({ className = '' }: Props) {
  return (
    <svg className={`st cl-sun-st ${className}`} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <path className="cl-rays" vectorEffect={NS} d="M40 4v10M40 66v10M4 40h10M66 40h10M14 14l7 7M59 59l7 7M66 14l-7 7M21 59l-7 7" />
      <circle className="cl-sun" vectorEffect={NS} cx="40" cy="40" r="20" />
    </svg>
  );
}

export function MoonSticker({ className = '' }: Props) {
  return (
    <svg className={`st cl-moon ${className}`} viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <path vectorEffect={NS} d="M52 10a30 30 0 1 0 18 46A26 26 0 0 1 52 10z" />
    </svg>
  );
}
