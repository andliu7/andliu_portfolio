'use client';
import { useEffect, useRef, useState, type CSSProperties, type JSX } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EVENING } from '@/lib/site';
import { parseTwoVoice } from '@/components/site/type';
import { useReducedMotion } from '@/components/site/use-reduced-motion';
import { BarbellSticker, PanSticker } from '@/components/site/stickers/stickers';
import { BackpackSticker, BlobPerson, BookSticker, PotSticker, TableSticker, type PersonTone } from './stickers';

// The evening reel, inside the island finale (app/sections/island.tsx). Andrew 2026-10-07: "include
// the little characters going through a little carousel to show each of the off the clock
// transitions". It replaced the pinned Off the clock strip. One scene at a time from
// EVENING.scenes, in his order: the island's round people and the scene's sticker slide in from
// the right, fading in, and slide out to the left, fading out. Styles are in app/sections/island.css.
//
// It sits small in the island's left column under a small OFF THE CLOCK title (Andrew 2026-10-07).
// Moving on: one timer, every 4.5s, and only while the reel is on screen, not hovered, not focused
// and under full motion. Prev and next step by hand. Under reduced motion it never moves on its
// own and the scenes cross-fade instead of sliding. The caption under the stage is aria-live
// "polite" only while the reel is still, so a screen reader is not read a new scene every 4.5s.

type Scene = (typeof EVENING.scenes)[number];

// COOK's art: the pan with a herb pot beside it, since the garden fuels the cooking (Andrew
// 2026-10-06). <>...</> is a Fragment: two siblings without a wrapper element.
function CookArt({ className }: { className?: string }) {
  return <><PotSticker className="er-herb" /><PanSticker className={className} /></>;
}

// One sticker per scene, by EVENING.scenes id.
const ART: Record<Scene['id'], (props: { className?: string }) => JSX.Element> = {
  after: BackpackSticker, gym: BarbellSticker, cook: CookArt, eat: TableSticker, study: BookSticker, someday: PotSticker,
};

// The round people acting out each scene, left of its sticker.
const CROWD: Record<Scene['id'], { tone: PersonTone; tall?: boolean; extra?: 'band' | 'chef' | 'book' }[]> = {
  after: [{ tone: 'gold' }],
  gym: [{ tone: 'pink', tall: true, extra: 'band' }, { tone: 'teal', extra: 'band' }],
  cook: [{ tone: 'sky', tall: true, extra: 'chef' }, { tone: 'apricot' }],
  eat: [{ tone: 'leaf' }],
  study: [{ tone: 'pink', extra: 'book' }, { tone: 'apricot', tall: true, extra: 'book' }, { tone: 'teal', extra: 'book' }],
  someday: [{ tone: 'leaf', tall: true }],
};

const STEP_MS = 4500;

export function EveningReel() {
  const scenes = EVENING.scenes;
  const n = scenes.length;
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false); // hovered or focused
  const [seen, setSeen] = useState(false); // on screen
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const playing = seen && !held && !reduced;

  // On screen or not. IntersectionObserver calls back when the reel enters or leaves the window.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setSeen(entry.isIntersecting));
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // The one timer. `at` is a dependency, so each step (by the timer or by hand) restarts the wait.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setAt(i => (i + 1) % n), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, at, n]);

  // Each scene's place: "now" in view, "was" just slid out left, the rest waiting on the right.
  // Wrapping from the last scene to the first, the first is waiting on the right, so it still slides in.
  const scene = scenes[at];
  const place = (i: number) => (i === at ? 'now' : i === (at - 1 + n) % n ? 'was' : 'next');

  return (
    <div
      ref={rootRef} className="er" role="group" aria-roledescription="carousel" aria-label={EVENING.label}
      onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false); }}
    >
      <div className="er-stage" aria-hidden="true">
        {scenes.map((s, i) => {
          const Art = ART[s.id];
          return (
            <div key={s.id} className={`er-scene er-${s.id}`} data-place={place(i)}>
              <div className="er-crowd">
                {CROWD[s.id].map((who, k) => <span key={k} className="er-who" style={{ '--k': k } as CSSProperties}><BlobPerson {...who} /></span>)}
              </div>
              <div className="er-art"><Art className="er-st" /></div>
            </div>
          );
        })}
        <span className="er-ground" />
      </div>
      <div className="er-bar">
        <button type="button" className="er-btn" aria-label={EVENING.prev} onClick={() => setAt(i => (i - 1 + n) % n)}><ChevronLeft size={20} aria-hidden="true" /></button>
        {/* The live region stays mounted; key={at} on the span inside makes React mount a fresh
            span each scene, which replays its CSS fade-in. */}
        <p className="er-cap" aria-live={playing ? 'off' : 'polite'}>
          <span key={at} className="er-cap-in">
            <span className="er-when">{scene.when}</span>{' '}
            <span className="er-voice">{parseTwoVoice(scene.voice).map((part, k) => (part.kw ? <em key={k}>{part.text}</em> : part.text))}</span>
          </span>
        </p>
        <button type="button" className="er-btn" aria-label={EVENING.next} onClick={() => setAt(i => (i + 1) % n)}><ChevronRight size={20} aria-hidden="true" /></button>
      </div>
    </div>
  );
}
