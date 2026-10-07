import type { JSX } from 'react';

// One small flat icon per Contents row (Andrew 2026-10-06: an icon for the game, a waving hand for
// "Say hi", a clock knocked off its hinges for "Off the clock"), keyed by the row's href. Drawn
// here as inline SVG, not emoji, so they look the same on every system: flat fills, every shape
// outlined in ink at 2px whatever the size (vector-effect="non-scaling-stroke"). Decoration only
// (the row's text names the section), so each is aria-hidden. The hand waves and the clock wobbles
// on row hover and focus (contents.css); reduced motion: still.

const NS = 'non-scaling-stroke' as const;
const INK = '#12142b'; // the site's --ink (an SVG attribute cannot read a CSS variable)
const S = { stroke: INK, strokeWidth: 2, vectorEffect: NS, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const Berry = () => (
  <svg viewBox="0 0 48 48"><circle cx="24" cy="27" r="17" fill="#3b4f9e" {...S} /><ellipse cx="17" cy="21" rx="4" ry="2.6" fill="#c9d1f4" opacity=".6" transform="rotate(-30 17 21)" />
    <path d="M24 9l3 4 4-1-2 4H19l-2-4 4 1z" fill={INK} /><circle cx="19" cy="27" r="1.8" fill={INK} /><circle cx="29" cy="27" r="1.8" fill={INK} /><path d="M21 32q3 2.4 6 0" fill="none" {...S} /></svg>
);
const Folder = () => (
  <svg viewBox="0 0 48 48"><path d="M5 13a3 3 0 0 1 3-3h10l4 4h18a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="#FFCF98" {...S} />
    <path d="M5 19h38" fill="none" {...S} /><rect x="12" y="25" width="14" height="4" rx="2" fill="#fbf8f1" {...S} /></svg>
);
const Bars = () => (
  <svg viewBox="0 0 48 48"><rect x="6" y="26" width="9" height="16" rx="2" fill="#6FCFAE" {...S} /><rect x="19.5" y="17" width="9" height="25" rx="2" fill="#FFD98A" {...S} />
    <rect x="33" y="7" width="9" height="35" rx="2" fill="#F4A7B9" {...S} /></svg>
);
const Calendar = () => (
  <svg viewBox="0 0 48 48"><rect x="6" y="9" width="36" height="33" rx="5" fill="#fbf8f1" {...S} /><path d="M6 14a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v5H6z" fill="#916BBF" {...S} />
    <path d="M15 5v8M33 5v8" fill="none" {...S} strokeWidth={3} /><rect x="13" y="25" width="6" height="5" rx="1" fill="#FFD98A" /><rect x="22" y="25" width="6" height="5" rx="1" fill={INK} opacity=".25" /><rect x="31" y="25" width="6" height="5" rx="1" fill={INK} opacity=".25" /><rect x="13" y="33" width="6" height="5" rx="1" fill={INK} opacity=".25" /></svg>
);
// The clock knocked off its hinges: the face swung down on one hinge, the other pin popped out
// and falling, the hands askew, a spring sticking out of the gap
const OffClock = () => (
  <svg viewBox="0 0 48 48">
    <path d="M30 9c3-1 5 2 3 4s0 4 3 3 4 2 2 4" fill="none" {...S} />
    <g className="toc-ic-swing">
      <circle cx="21" cy="27" r="15" fill="#FFD98A" {...S} /><circle cx="21" cy="27" r="10.5" fill="#fbf8f1" {...S} />
      <path d="M21 27l-5-6M21 27l7 3" fill="none" {...S} strokeWidth={2.5} />
      <circle cx="11" cy="14" r="2.6" fill="#F4A7B9" {...S} />
    </g>
    <circle cx="40" cy="38" r="2.6" fill="#F4A7B9" {...S} /><path d="M37 33l2 1M42 32l-1 2" fill="none" {...S} />
  </svg>
);
const Hand = () => (
  <svg viewBox="0 0 48 48"><g className="toc-ic-wave">
    <path d="M14 26V12a3 3 0 0 1 6 0v10V8a3 3 0 0 1 6 0v14V10a3 3 0 0 1 6 0v14-8a3 3 0 0 1 6 0v14c0 9-6 14-13 14-6 0-9-3-12-7l-6-8a3 3 0 0 1 5-4z" fill="#FFCF98" {...S} />
    <path d="M6 10q-2 4 0 8M40 4q4 3 4 8" fill="none" {...S} opacity=".6" />
  </g></svg>
);
const Controller = () => (
  <svg viewBox="0 0 48 48"><path d="M13 14h22c6 0 9 6 10 14s-2 12-6 12-6-6-9-6H18c-3 0-5 6-9 6s-7-4-6-12 4-14 10-14z" fill="#C9BEE3" {...S} />
    <path d="M14 21v8M10 25h8" fill="none" {...S} strokeWidth={3} /><circle cx="33" cy="22" r="2.4" fill="#F4A7B9" {...S} /><circle cx="37" cy="27" r="2.4" fill="#6FCFAE" {...S} /></svg>
);

export const ROW_ICONS: Record<string, () => JSX.Element> = {
  '#blueberry': Berry,
  '#work': Folder,
  '#impact': Bars,
  '#experience': Calendar,
  '#offclock': OffClock,
  '#contact': Hand,
  '#island': Controller,
};
