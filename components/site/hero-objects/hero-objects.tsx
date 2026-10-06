import type { CSSProperties } from 'react';
import { HERO } from '@/lib/site';
import './hero-objects.css';

// The four cartoon objects around the hero's name (the approved design canvas, Main.dc.html):
// a pencil for the Focus Family guide, a laptop for Second Brain, a phone for Blueberry and its
// game, a note card for Flashcards. Flat fills, every shape outlined in ink at 2px whatever the
// object's size (vector-effect="non-scaling-stroke"), like components/site/stickers.
//
// Each object is a real link to its project with a small visible label. Where each one sits,
// its tilt and its timing live in hero-objects.css; the hero's own CSS supplies --fs (the name's
// font size), which every position and size is measured in.

const NS = 'non-scaling-stroke' as const;
const INK = '#12142b'; // the site's --ink (an SVG attribute cannot read a CSS variable)

function Pencil() {
  return (
    <svg viewBox="0 0 40 96" aria-hidden="true" focusable="false">
      <g stroke={INK} strokeWidth="2" vectorEffect={NS} strokeLinejoin="round">
        <rect x="8" y="4" width="24" height="14" rx="5" fill="#F4A7B9" vectorEffect={NS} />
        <rect x="8" y="16" width="24" height="8" fill="#C9BEE3" vectorEffect={NS} />
        <rect x="8" y="24" width="24" height="50" fill="#FFD98A" vectorEffect={NS} />
        <path d="M8 74 L20 93 L32 74 Z" fill="#F7E1C4" vectorEffect={NS} />
      </g>
      <line x1="20" y1="24" x2="20" y2="74" stroke={INK} strokeWidth="1.5" opacity=".35" vectorEffect={NS} />
      <path d="M16.5 87.5 L20 93 L23.5 87.5 Z" fill={INK} />
    </svg>
  );
}

function Laptop() {
  return (
    <svg viewBox="0 0 132 96" aria-hidden="true" focusable="false">
      <rect x="16" y="6" width="100" height="66" rx="8" fill="#1d2654" stroke={INK} strokeWidth="2" vectorEffect={NS} />
      <circle cx="66" cy="39" r="22" fill="none" stroke="#916BBF" strokeWidth="1.5" vectorEffect={NS} />
      <path d="M56 31 L72 28 L78 42 L62 45 Z" fill="none" stroke="#C9BEE3" strokeWidth="1" opacity=".8" vectorEffect={NS} />
      <circle cx="56" cy="31" r="2.5" fill="#6FCFAE" />
      <circle cx="72" cy="28" r="2" fill="#F4A7B9" />
      <circle cx="62" cy="45" r="2.5" fill="#6FCFAE" />
      <circle cx="78" cy="42" r="2" fill="#FFD98A" />
      <circle cx="68" cy="52" r="2" fill="#F4A7B9" />
      <path d="M4 74 H128 L120 88 H12 Z" fill="#C9BEE3" stroke={INK} strokeWidth="2" strokeLinejoin="round" vectorEffect={NS} />
      <rect x="54" y="74" width="24" height="4" rx="2" fill={INK} opacity=".35" />
    </svg>
  );
}

function Phone() {
  return (
    <svg viewBox="0 0 56 96" aria-hidden="true" focusable="false">
      <rect x="4" y="2" width="48" height="92" rx="12" fill="#fbf8f1" stroke={INK} strokeWidth="2" vectorEffect={NS} />
      <rect x="9" y="12" width="38" height="70" rx="5" fill="#3b4f9e" />
      <rect x="22" y="6" width="12" height="3" rx="1.5" fill={INK} />
      <g stroke={INK} strokeWidth="2">
        <circle cx="20" cy="70" r="6" fill="#FFD98A" vectorEffect={NS} />
        <circle cx="34" cy="52" r="6" fill="#6FCFAE" vectorEffect={NS} />
        <circle cx="21" cy="34" r="6" fill="#fbf8f1" vectorEffect={NS} />
        <circle cx="34" cy="20" r="5" fill="#916BBF" vectorEffect={NS} />
      </g>
    </svg>
  );
}

function NoteCard() {
  return (
    <svg viewBox="0 0 104 96" aria-hidden="true" focusable="false">
      <rect x="18" y="8" width="80" height="58" rx="8" fill="#FFCF98" stroke={INK} strokeWidth="2" vectorEffect={NS} transform="rotate(8 58 37)" />
      <rect x="6" y="22" width="80" height="58" rx="8" fill="#FFFAF0" stroke={INK} strokeWidth="2" vectorEffect={NS} />
      <text x="18" y="46" fontFamily="Fira Code, monospace" fontWeight="700" fontSize="16" fill={INK}>Q.</text>
      <line x1="18" y1="58" x2="72" y2="58" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity=".35" vectorEffect={NS} />
      <line x1="18" y1="68" x2="58" y2="68" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity=".35" vectorEffect={NS} />
    </svg>
  );
}

// key: which drawing; --k orders the pop-in and offsets each bob so no two move in step
const OBJECTS = [
  { key: 'pencil', Art: Pencil },
  { key: 'laptop', Art: Laptop },
  { key: 'phone', Art: Phone },
  { key: 'card', Art: NoteCard },
] as const;

export function HeroObjects() {
  return (
    <div className="hob-layer">
      {OBJECTS.map(({ key, Art }, k) => {
        const { label, href } = HERO.objects[key];
        return (
          <a key={key} className={`hob hob-${key}`} href={href} style={{ '--k': k } as CSSProperties}>
            <span className="hob-art"><Art /></span>
            <span className="hob-label">{label}</span>
          </a>
        );
      })}
    </div>
  );
}
