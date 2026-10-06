import { ArrowUpRight } from 'lucide-react';
import { BB_ENGINEERING, BB_FACTS, BB_HEAD, BB_SCREENS, BLUEBERRY_CHAPTER, PROJECTS, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { Marquee } from '@/components/site/marquee';
import { TiltFrame } from '@/components/site/tilt-frame';
import { BlueberrySticker, FlashcardSticker } from '@/components/site/stickers/stickers';
import { CountUp } from '@/components/site/work/count-up';
import { Shot } from '@/components/site/work/shot';
import './blueberry.css';

// The Blueberry chapter (SITE-PLAN.md 4.4), style pass 2026-10-06. The product's slogan section
// that used to sit above it was removed; this chapter tells how it got here and what it is made of:
//   1. head:    a crushed two-line headline with stickers on it, the story at reading width,
//               and the facts as count-up stickers beside it
//   2. screens: a sky band; four real captures, each a feature mid-use, in a 2x2 grid
//   3. stack:   the stack as pills in an ink marquee strip
// The exploded phone and its "layer by layer" list were removed 2026-10-06 (Andrew: the layers
// did not make sense); what replaces them is not decided yet.
// The bands are Slush's colour bands: rounded panels inset from the berry ground, each carrying
// data-ground="paper" so the text, links and focus ring inside switch to ink.
// Left out on purpose: the "cards in his first deck" fact and the deck layer's label. Both come
// from lib/bb-deck.json (`count`), which does not exist yet, and a fact without its number is
// worse than no fact. They return when scripts/bb-deck.mjs writes that file.
//
// A server component; TiltFrame, CountUp and the marquee are the only client parts.

// The chapter is project 01 of the numbered list (Projects carries on from 02), so its headline
// wears the same outlined index number as the project spreads.
const NUM = PROJECTS.find(p => p.id === 'blueberry')?.num;
const FACTS = BB_FACTS.filter(fact => fact.value !== undefined);
const SHOT_FILLS = ['apricot', 'card', 'berry-soft', 'apricot'] as const;
const FACT_FILLS = ['apricot', 'sky', 'berry-soft'] as const;
// The band repeats the stack twice so one copy is wider than the screen and the loop never
// shows a gap; screen readers get the list once, from the marquee's label.
const BAND = [...BB_ENGINEERING.stack, ...BB_ENGINEERING.stack];

export default function Blueberry() {
  return (
    <section {...sectionAttrs('blueberry')} className="bb" aria-labelledby="blueberry-title">
      <div className="bb-head">
        {NUM && <span className="bb-num" aria-hidden="true">{NUM}</span>}
        <div className="bb-title">
          <FlipHeading id="blueberry-title" text={BB_HEAD.headline} max={168} />
          <span className="bb-st bb-st-card" data-reveal><FlashcardSticker /></span>
          <span className="bb-st bb-st-berry" data-reveal><BlueberrySticker /></span>
        </div>
        <div className="bb-intro">
          <p className="bb-story" data-reveal="lines">{BLUEBERRY_CHAPTER.story}</p>
          <ul className="bb-facts">
            {FACTS.map((fact, i) => (
              <li key={fact.id} className="bb-fact" data-fill={FACT_FILLS[i % FACT_FILLS.length]} data-reveal>
                <CountUp value={fact.value ?? 0} className="bb-fact-n" />
                <span className="bb-fact-label">{fact.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bb-band bb-screens" data-ground="paper">
        <span className="eyebrow">{BB_HEAD.screens}</span>
        <ul className="bb-shots">
          {BB_SCREENS.map((screen, i) => (
            <li key={screen.caption} className="bb-shot" data-reveal>
              <div className="bb-shot-tile" data-fill={SHOT_FILLS[i]}>
                <TiltFrame max={7} shift={10} layers={[{ depth: 0.6, node: <span className="bb-crop"><Shot image={screen.image} sizes="(min-width: 760px) 45vw, 90vw" /></span> }]} />
              </div>
              <a className="bb-route" href={screen.href} target="_blank" rel="noreferrer">
                {screen.caption} <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="bb-stack">
        <span className="eyebrow">{BB_HEAD.stack}</span>
        <Marquee className="bb-strip" label={BB_ENGINEERING.stack.join(', ')} duration={34} fade={false}>
          {BAND.map((tag, i) => <span key={i} className="bb-pill">{tag}</span>)}
        </Marquee>
      </div>
    </section>
  );
}
