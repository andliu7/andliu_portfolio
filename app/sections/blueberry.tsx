import { BB_CAROUSEL, BB_ENGINEERING, BB_FACTS, BB_HEAD, BB_SCREENS, BB_SITE, BLUEBERRY_CHAPTER, IMAGES, PROJECTS, sectionAttrs, type ImageEntry } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { StackChip } from '@/components/site/stack-logos';
import { BlueberrySticker, FlashcardSticker } from '@/components/site/stickers/stickers';
import { CountUp } from '@/components/site/work/count-up';
import PolaroidLineCarousel, { PolaroidMini, type Slide } from '@/components/ui/polaroid-line-carousel';
import { BlueberrySwing } from './blueberry.client';
import './blueberry.css';

// The Blueberry chapter (SITE-PLAN.md 4.4), style pass 2026-10-06. The product's slogan section
// that used to sit above it was removed; this chapter tells how it got here and what it is made of:
//   1. head:    a crushed two-line headline with stickers on it, the story at reading width,
//               and the facts as count-up stickers beside it
//   2. screens: a sky band; FOR REAL! in giant display type beside four app captures, each a
//               feature mid-use, hung as prints on a string (the first a recording of arrows
//               being pushed); the website around the app in a small carousel under FOR REAL!
//   3. stack:   the stack as logo chips sliding along an ink strip, which straddles the chapter's
//               rounded foot and settles onto Selected work's ground as it scrolls (blueberry.css)
// The exploded phone and its "layer by layer" list were removed 2026-10-06 (Andrew: the layers
// did not make sense); what replaces them is not decided yet.
// The bands are Slush's colour bands: rounded panels inset from the berry ground, each carrying
// data-ground="paper" so the text, links and focus ring inside switch to ink.
// Left out on purpose: the "cards in his first deck" fact and the deck layer's label. Both come
// from lib/bb-deck.json (`count`), which does not exist yet, and a fact without its number is
// worse than no fact. They return when scripts/bb-deck.mjs writes that file.
//
// Everything sits in one inner layer, .bb-flow, which carries the chapter's ground: as the
// chapter scrolls in over Contents, that layer swings up from 30deg to flat (blueberry.client.tsx).
//
// A server component; CountUp, the carousel, the stack slider and the swing are the only client parts.

// The chapter is project 01 of the numbered list (Projects carries on from 02), so its headline
// wears the same outlined index number as the project spreads.
const NUM = PROJECTS.find(p => p.id === 'blueberry')?.num;
const FACTS = BB_FACTS.filter(fact => fact.value !== undefined);
const FACT_FILLS = ['apricot', 'sky', 'berry-soft'] as const;
// The captures as slides: each IMAGES entry's files and alt, with the screen's own title, caption
// and live route. The four app screens hang on the line (Andrew 2026-10-07: "keep it four because
// for is a pun"); the website shots go in the small carousel.
// Each app print zooms in on the moment its caption names, so the molecules and labels can be
// read at print size (a whole app screen at 400px is a navy rectangle). Picked by eye from the
// 800px files: x% y% is the point of the shot that stays put, scale the zoom. Kept modest where
// the caption names something wide (all four rating buttons). The website shots were cropped
// to their headings when captured, so they need none.
const CROPS: Partial<Record<keyof typeof IMAGES, Slide['crop']>> = {
  bbAldol: { x: 20, y: 45, scale: 1.08 },        // the step text and the molecules with their arrows
  bbFlashcards: { x: 50, y: 100, scale: 1.15 },  // the two molecules and the Again/Hard/Good/Easy row
  bbArrows: { x: 50, y: 100, scale: 1.3 },       // the curved arrow between the three carbons
  bbPathway: { x: 0, y: 0, scale: 1.1 },         // the unit header and the first lesson nodes
};
function toSlide(screen: { image: keyof typeof IMAGES; title: string; caption: string; route?: string; href?: string }): Slide {
  const entry: ImageEntry = IMAGES[screen.image];
  return { image: entry.src, sm: entry.sm, alt: entry.alt, video: entry.video, title: screen.title, caption: screen.caption, href: screen.href, linkText: screen.route, crop: CROPS[screen.image] };
}
const LINE = BB_SCREENS.map(toSlide);
const SITE = BB_SITE.map(toSlide);
// The band repeats the stack twice so one copy is wider than the screen and the loop never
// shows a gap; the repeats are marked `repeat`, so screen readers get the list once.
const BAND = [...BB_ENGINEERING.stack, ...BB_ENGINEERING.stack];

export default function Blueberry() {
  return (
    <section {...sectionAttrs('blueberry')} className="bb" aria-labelledby="blueberry-title">
      <BlueberrySwing />
      <div className="bb-flow">
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
          <div className="bb-real">
            <span className="eyebrow">{BB_HEAD.screens}</span>
            <p className="bb-real-word" data-reveal>
              {/* A closing "!" gets its own span, so CSS can tuck the monospace glyph's wide side
                  bearing back against the letter before it. */}
              {BB_HEAD.forReal.split('\n').map(line => (
                <span key={line}>{line.endsWith('!') ? <>{line.slice(0, -1)}<span className="bb-bang">!</span></> : line}</span>
              ))}
            </p>
          </div>
          <PolaroidLineCarousel
            className="bb-line"
            slides={LINE}
            height="var(--bb-line-h)"
            cardWidth={460}
            label={BB_CAROUSEL.label}
            prevLabel={BB_CAROUSEL.prev}
            nextLabel={BB_CAROUSEL.next}
          />
          <div className="bb-more">
            <span className="eyebrow">{BB_HEAD.site}</span>
            <PolaroidMini
              slides={SITE}
              label={BB_CAROUSEL.more}
              prevLabel={BB_CAROUSEL.prev}
              nextLabel={BB_CAROUSEL.next}
            />
          </div>
        </div>

        <div className="bb-stack">
          <span className="eyebrow">{BB_HEAD.stack}</span>
          <div className="bb-strip">
            <InfiniteSlider label={BB_HEAD.stack} gap={14} duration={40} durationOnHover={110}>
              {BAND.map((tag, i) => <StackChip key={i} name={tag} repeat={i >= BB_ENGINEERING.stack.length} className="bb-pill" />)}
            </InfiniteSlider>
          </div>
        </div>
      </div>
    </section>
  );
}
