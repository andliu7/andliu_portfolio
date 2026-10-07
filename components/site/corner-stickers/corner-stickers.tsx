import type { CSSProperties, JSX } from 'react';
import './corner-stickers.css';

// Small flat stickers in a section's corners (Andrew 2026-10-06: "for each part, add a couple of
// cute icons around the corners"; none on College Park, and the Contents has its own spinning
// compass, app/sections/contents.client.tsx). Original art in the site's sticker language: flat fills, every
// shape outlined in ink at 2px whatever the size (vector-effect="non-scaling-stroke"), a slight
// tilt, a slow bob. Pure decoration: the layer is aria-hidden, takes no pointer, and each sticker
// sits in a margin the section leaves empty (positions per section in corner-stickers.css).
// Phones get fewer and smaller (the third sticker, .cs-wide, hides under 700px).
//
// Usage: <CornerStickers set="impact" /> as the first child of a positioned box (a section, or the
// sticky frame of a pinned one). A server component: plain markup, the motion is CSS.

const NS = 'non-scaling-stroke' as const;
const INK = '#12142b'; // the site's --ink (an SVG attribute cannot read a CSS variable)
const S = { stroke: INK, strokeWidth: 2, vectorEffect: NS, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const Chart = () => (
  <svg viewBox="0 0 64 64"><rect x="5" y="9" width="54" height="46" rx="8" fill="#fbf8f1" {...S} />
    <rect x="14" y="34" width="8" height="13" fill="#6FCFAE" {...S} /><rect x="28" y="26" width="8" height="21" fill="#FFD98A" {...S} /><rect x="42" y="17" width="8" height="30" fill="#F4A7B9" {...S} /></svg>
);
const Sparkle = () => (
  <svg viewBox="0 0 64 64"><path d="M32 4c3 16 12 25 28 28-16 3-25 12-28 28-3-16-12-25-28-28 16-3 25-12 28-28z" fill="#C9BEE3" {...S} /></svg>
);
const Clock = () => (
  <svg viewBox="0 0 64 64"><circle cx="32" cy="34" r="26" fill="#FFD98A" {...S} /><circle cx="32" cy="34" r="19" fill="#fbf8f1" {...S} />
    <path d="M32 22v12l8 6" fill="none" {...S} strokeWidth={3} /><path d="M14 10l-6 6M50 10l6 6" fill="none" {...S} strokeWidth={3} /></svg>
);
const Briefcase = () => (
  <svg viewBox="0 0 64 64"><path d="M24 18v-6h16v6" fill="none" {...S} strokeWidth={3} /><rect x="6" y="18" width="52" height="38" rx="7" fill="#FFCF98" {...S} />
    <path d="M6 32h52" {...S} fill="none" /><rect x="27" y="28" width="10" height="8" rx="2" fill="#916BBF" {...S} /></svg>
);
const Pot = () => (
  <svg viewBox="0 0 64 64"><path d="M32 32c-2-10-10-16-18-14 2 8 9 14 18 14zM32 30c2-12 10-18 20-16-2 10-10 16-20 16z" fill="#6FCFAE" {...S} /><path d="M32 32V22" {...S} fill="none" />
    <path d="M14 34h36l-5 24H19z" fill="#E8956B" {...S} /><rect x="11" y="32" width="42" height="8" rx="3" fill="#F2B08F" {...S} /></svg>
);
const Moon = () => (
  <svg viewBox="0 0 64 64"><path d="M40 6a26 26 0 1 0 18 40A22 22 0 0 1 40 6z" fill="#FFD98A" {...S} />
    <circle cx="26" cy="34" r="2" fill={INK} /><path d="M30 42q-4 3-8 0" {...S} fill="none" /><circle cx="20" cy="22" r="3" fill="#F7E1C4" /></svg>
);
const Envelope = () => (
  <svg viewBox="0 0 64 64"><rect x="5" y="14" width="54" height="38" rx="6" fill="#fbf8f1" {...S} /><path d="M6 17l26 20 26-20" fill="#F4A7B9" {...S} />
    <path d="M44 22c3-4 9-1 6 4l-6 5-6-5c-3-5 3-8 6-4z" fill="#3b4f9e" stroke="none" transform="translate(-12 6) scale(.9)" /></svg>
);
const Plane = () => (
  <svg viewBox="0 0 64 64"><path d="M4 30L60 8 46 56 32 40z" fill="#C9BEE3" {...S} /><path d="M32 40l28-32-36 26 2 18z" fill="#A99DD3" {...S} /></svg>
);
const Palm = () => (
  <svg viewBox="0 0 64 64"><path d="M30 24c2 12 2 24-2 36h8c3-12 2-24-2-36z" fill="#FFCF98" {...S} />
    <path d="M32 22C24 10 12 10 6 18c10-2 18 0 26 4zM32 22c8-12 20-12 26-4-10-2-18 0-26 4zM32 22C28 12 32 4 40 2c-4 6-6 12-8 20zM32 22c-10 0-18 6-20 14 6-6 12-10 20-14zM32 22c10 0 18 6 20 14-6-6-12-10-20-14z" fill="#6FCFAE" {...S} />
    <circle cx="29" cy="25" r="3" fill="#916BBF" {...S} /><circle cx="35" cy="25" r="3" fill="#916BBF" {...S} /></svg>
);
const Wave = () => (
  <svg viewBox="0 0 64 64"><path d="M4 44c8-22 30-30 44-18 6 5 4 14-3 14-6 0-6-8 0-8-10-8-24 0-28 16z" fill="#87ceeb" {...S} />
    <path d="M4 44c10 6 22 6 32 0s22-6 26 0v12H4z" fill="#3b4f9e" {...S} /></svg>
);

type Item = { Art: () => JSX.Element; wide?: boolean };

// In each set the order is the CSS order: .cs-1, .cs-2, .cs-3 (corner-stickers.css places them).
const SETS = {
  impact: [{ Art: Chart }, { Art: Sparkle }],
  experience: [{ Art: Clock }, { Art: Briefcase }],
  offclock: [{ Art: Moon }, { Art: Pot }],
  contact: [{ Art: Envelope }, { Art: Plane }],
  island: [{ Art: Palm }, { Art: Wave }],
} satisfies Record<string, Item[]>;

export type CornerSet = keyof typeof SETS;

export function CornerStickers({ set }: { set: CornerSet }) {
  const items: Item[] = SETS[set];
  return (
    <div className={`cs-layer cs-${set}`} aria-hidden="true">
      {items.map(({ Art, wide }, i) => (
        // --k offsets each sticker's bob so no two move in step
        <span key={i} className={`cs cs-${i + 1}${wide ? ' cs-wide' : ''}`} style={{ '--k': i } as CSSProperties}><Art /></span>
      ))}
    </div>
  );
}

export default CornerStickers;
