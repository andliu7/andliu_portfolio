'use client';
import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { FORK, MICROCOPY } from '@/lib/site';
import { BarbellSticker, BlueberrySticker, FlashcardSticker, PanSticker, SprigSticker } from '@/components/site/stickers/stickers';

// The ON / OFF fork (SITE-PLAN.md 4.2) as one big switch: "THE CLOCK", on or off. Flipping it
// swaps the card beside it between the work (on) and the rest of the week (off).
//
// It follows components/site/switch.tsx (role="switch", aria-checked, the parent owns the
// state) but is drawn large, so it lives here with its own CSS (manifesto.css, .mf-sw).
// Keyboard: it is a real <button>, so Space and Enter click it; the arrow keys also set it
// (left is on, right is off, matching where each word sits on the track).
// The card is aria-live="polite", so a screen reader hears the new card after a flip.
// key={side} on the card makes React mount a fresh card on each flip, which replays its CSS
// pop-in animation (a remount is the simplest way to restart a CSS animation).

const SIDES = {
  on: { line: MICROCOPY.forkCounts, cta: FORK.on.cta, href: FORK.on.href, art: [BlueberrySticker, FlashcardSticker] },
  off: { line: FORK.off.line, cta: FORK.off.cta, href: FORK.off.href, art: [PanSticker, BarbellSticker, SprigSticker] },
} as const;

export function ForkSwitch() {
  const [on, setOn] = useState(true);
  const side = on ? 'on' : 'off';
  const card = SIDES[side];

  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); setOn(true); }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); setOn(false); }
  };

  return (
    <div className="mf-fork" data-side={side}>
      <div className="mf-switchbox">
        <span className="mf-clock" id="mf-clock">{FORK.on.head}</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="mf-clock"
          className="mf-sw"
          onClick={() => setOn(!on)}
          onKeyDown={onKey}
        >
          <span className="mf-sw-word mf-sw-on" aria-hidden="true">{FORK.on.voice}</span>
          <span className="mf-sw-word mf-sw-off" aria-hidden="true">{FORK.off.voice}</span>
          <span className="mf-sw-knob" aria-hidden="true" />
        </button>
      </div>
      <div className="mf-card-slot" aria-live="polite">
        <div className={`mf-card mf-card-${side}`} key={side}>
          <div className="mf-card-art" aria-hidden="true">
            {card.art.map((Art, i) => <span className="mf-card-st" key={i} style={{ '--k': i } as CSSProperties}><Art /></span>)}
          </div>
          <p className="mf-card-line">{card.line}</p>
          <a className="pill pill-berry press" href={card.href}>{card.cta} <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </div>
    </div>
  );
}
