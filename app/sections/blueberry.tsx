import { ArrowUpRight } from 'lucide-react';
import { BB_ENGINEERING, BB_FACTS, BB_HEAD, BB_SCREENS, BLUEBERRY_CHAPTER, PHONE_LAYERS, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { Marquee } from '@/components/site/marquee';
import { TiltFrame } from '@/components/site/tilt-frame';
import { BlueberrySticker, FlashcardSticker, MoleculeSticker } from '@/components/site/stickers/stickers';
import { CountUp } from '@/components/site/work/count-up';
import { ExplodedPhone } from '@/components/site/work/phone';
import { Shot } from '@/components/site/work/shot';
import './blueberry.css';

// The Blueberry chapter (SITE-PLAN.md 4.4), style pass 2026-10-06. The dive above carries the
// product headline; this chapter tells how it got here and what it is made of:
//   1. head:    a crushed two-line headline with stickers on it, the story at reading width,
//               and the facts as count-up stickers beside it
//   2. screens: a sky band; the three real captures, each zoomed to one readable region
//   3. layers:  a lavender band; the exploded phone (CSS 3D, decoration) beside the layer list
//   4. stack:   the stack as pills in an ink marquee strip
// The bands are Slush's colour bands: rounded panels inset from the berry ground, each carrying
// data-ground="paper" so the text, links and focus ring inside switch to ink.
// Left out on purpose: the "cards in his first deck" fact and the deck layer's label. Both come
// from lib/bb-deck.json (`count`), which does not exist yet, and a fact without its number is
// worse than no fact. They return when scripts/bb-deck.mjs writes that file.
//
// A server component; TiltFrame, CountUp and the marquee are the only client parts.

const FACTS = BB_FACTS.filter(fact => fact.value !== undefined);
const LAYERS = PHONE_LAYERS.filter(layer => typeof layer.label === 'string');
const SHOT_FILLS = ['apricot', 'card', 'berry-soft'] as const;
const FACT_FILLS = ['apricot', 'sky', 'berry-soft'] as const;
const LAYER_FILLS = ['sky', 'apricot', 'card', 'tile-gold'] as const;
// The band repeats the stack twice so one copy is wider than the screen and the loop never
// shows a gap; screen readers get the list once, from the marquee's label.
const BAND = [...BB_ENGINEERING.stack, ...BB_ENGINEERING.stack];

export default function Blueberry() {
  return (
    <section {...sectionAttrs('blueberry')} className="bb" aria-labelledby="blueberry-title">
      <div className="bb-head">
        <div className="bb-title">
          <FlipHeading id="blueberry-title" text={BB_HEAD.headline} max={168} />
          <span className="bb-st bb-st-card" data-reveal><FlashcardSticker /></span>
          <span className="bb-st bb-st-berry" data-reveal><BlueberrySticker /></span>
          <span className="bb-st bb-st-mol" data-reveal><MoleculeSticker /></span>
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
                <TiltFrame max={7} shift={10} layers={[{ depth: 0.6, node: <span className="bb-crop" data-screen={i}><Shot image={screen.image} sizes="(min-width: 760px) 60vw, 200vw" /></span> }]} />
              </div>
              <a className="bb-route" href={screen.href} target="_blank" rel="noreferrer">
                {screen.caption} <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="bb-band bb-inside" data-ground="paper">
        <TiltFrame className="bb-phone-tilt" max={9} shift={0} layers={[{ depth: 0, node: <ExplodedPhone /> }]} />
        <div className="bb-layers-col">
          <span className="eyebrow">{BB_HEAD.layers}</span>
          <ol className="bb-layers">
            {LAYERS.map((layer, i) => (
              <li key={layer.id} className="bb-layer" data-fill={LAYER_FILLS[i]} data-reveal>
                <span className="bb-layer-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <span className="bb-layer-text">
                  <span className="bb-layer-name">{layer.name}</span>
                  <span className="bb-layer-label">{layer.label as string}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
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
