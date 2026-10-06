import { BarbellSticker, PanSticker } from '../stickers/stickers';
import './stickers.css';

// The closing sections' extra stickers, drawn to match the shared set in
// components/site/stickers/stickers.tsx (same .st base: flat token fills, 2px ink outline that
// never scales). The pan and barbell come from that shared set so the page has one of each;
// these add what it lacks: a plant in a pot (landscape design and the garden line), a sunrise
// (faith: a quiet morning), a clock (the title's "off the clock" made literal) and a sparkle
// (the small filler of a collage). Fills live in
// ./stickers.css: an SVG fill attribute cannot read a CSS variable everywhere.
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

// A sun half risen over a hill, three short rays.
export function SunriseSticker({ className = '' }: Props) {
  return (
    <svg className={`st cl-sunrise ${className}`} viewBox="0 0 140 100" aria-hidden="true" focusable="false">
      <path className="cl-rays" vectorEffect={NS} d="M70 14v-10M34 30l-8-8M106 30l8-8" />
      <path className="cl-sun" vectorEffect={NS} d="M30 74a40 40 0 0 1 80 0z" />
      <path className="cl-hill" vectorEffect={NS} d="M4 94c22-26 50-30 70-18s38 10 62 0v18H4z" />
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

/** One sticker per off-the-clock card. */
export const NOTE_STICKERS = { cooking: PanSticker, lifting: BarbellSticker, faith: SunriseSticker, landscape: PotSticker } as const;
