import type { CSSProperties } from 'react';
import { OFF_CLOCK, PORTRAITS, sectionAttrs, type PortraitId } from '@/lib/site';
import { FitHeading, parseTwoVoice } from '@/components/site/type';
import { Portrait } from '@/components/site/portrait';
import { BlueberrySticker } from '@/components/site/stickers/stickers';
import { ClockSticker, NOTE_STICKERS, SparkleSticker } from '@/components/site/closing/stickers';
import './offclock.css';

// Off the clock (SITE-PLAN.md 4.8): the eyebrow and the giant title with a sticker cluster on it
// (a clock, the blueberry, a sparkle: Slush never leaves display type alone), then four cards in
// a staggered 2x2: cooking, lifting, landscape design (with the UMD garden line and a potted
// plant) and faith. Each is a flat pastel card with its own sticker hanging off its top edge and
// its line as a pull quote in the reading face, keywords in berry. A photo of Andrew shows only
// once PORTRAITS[id].src is set in lib/site.ts. Every word comes from OFF_CLOCK; gardening is
// never a hobby here, only the UMD line beside landscape design.
//
// A server component. Each card carries data-reveal; offclock.css springs it in when the
// director (app/motion.tsx) marks it .is-in.

type Card = {
  key: keyof typeof NOTE_STICKERS;
  word: string;
  voice: string; // keywords in *asterisks*, as in OFF_CLOCK.notes
  sub: string | null;
  fill: 'apricot' | 'sky' | 'paper' | 'berry-soft';
  portrait: PortraitId | null;
};

const [cooking, lifting, faith] = OFF_CLOCK.notes;
const landscape = OFF_CLOCK.interests[2];

const CARDS: Card[] = [
  { key: 'cooking', word: cooking.word, voice: cooking.voice, sub: null, fill: 'apricot', portrait: cooking.portrait },
  { key: 'lifting', word: lifting.word, voice: lifting.voice, sub: null, fill: 'sky', portrait: lifting.portrait },
  { key: 'landscape', word: landscape.word, voice: landscape.line, sub: OFF_CLOCK.garden, fill: 'paper', portrait: null },
  { key: 'faith', word: faith.word, voice: faith.voice, sub: null, fill: 'berry-soft', portrait: faith.portrait },
];

export default function OffClock() {
  return (
    <section {...sectionAttrs('offclock')} className="offclock curve-top" aria-labelledby="offclock-title">
      <span className="eyebrow">{OFF_CLOCK.eyebrow}</span>
      <div className="oc-title-wrap">
        <FitHeading id="offclock-title" text={OFF_CLOCK.title} max={180} className="oc-title" />
        <div className="oc-cluster" aria-hidden="true" data-reveal="">
          <ClockSticker className="oc-cl-clock" />
          <BlueberrySticker className="oc-cl-berry" />
          <SparkleSticker className="oc-cl-spark" />
        </div>
      </div>
      <ul className="oc-notes">
        {CARDS.map((card, i) => {
          const Sticker = NOTE_STICKERS[card.key];
          return (
            // data-ground="paper" hands the card ink text and a berry keyword (the ground table in
            // globals.css); offclock.css paints the pastel fill over it.
            <li key={card.key} className="oc-note" data-fill={card.fill} data-ground="paper" data-reveal="" style={{ '--i': i } as CSSProperties}>
              <Sticker className="oc-sticker" />
              {card.portrait && PORTRAITS[card.portrait].src && <Portrait id={card.portrait} sizes="(min-width: 768px) 40vw, 80vw" className="oc-photo" />}
              <span className="eyebrow">{card.word}</span>
              <p className="oc-quote">
                {parseTwoVoice(card.voice).map((part, p) => (part.kw ? <em key={p} className="oc-kw">{part.text}</em> : part.text))}
              </p>
              {card.sub && <p className="oc-note-sub">{card.sub}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
