'use client';
import { useState, type CSSProperties, type JSX } from 'react';
import { EVENING, FORK, IMAGES, OFF_CLOCK, sectionAttrs } from '@/lib/site';
import { parseTwoVoice } from '@/components/site/type';
import { ClockSwitch } from '@/components/site/clock-switch';
import { useHorizontalScroll } from '@/components/site/use-horizontal-scroll';
import { BarbellSticker, PanSticker } from '@/components/site/stickers/stickers';
import { BackpackSticker, BookSticker, ClockSticker, MoonSticker, PotSticker, SparkleSticker, SunSticker, TableSticker } from '@/components/site/closing/stickers';
import './offclock.css';

// Off the clock (rebuilt 2026-10-06 from Andrew's note: "take me through my evening ... a
// horizontal scroll with more animated feeling"). The section pins and vertical scroll walks a
// strip through his evening, in his order: the intro ("mornings are for work"), after work or
// classes, the gym, cook, eat, Bible study (with a small shot of the Focus Family Circle room
// from his island), and a last "someday" panel that keeps landscape design and the UMD garden
// line. The pin itself lives in components/site/use-horizontal-scroll.ts, which explains it.
//
// Time of day: each panel is a flat band of colour, late afternoon (sky) to night (ink), so the
// ground darkens as you scroll. No gradient wash (Andrew is unsure about gradients). Over the
// strip a small sun rides an arc and turns into the moon past halfway; at the foot a progress line
// names each scene. Both read the scroll progress from one CSS variable, --p, set by the hook.
//
// The clock switch (Andrew liked it on the manifesto) sits at the foot: ON while the intro's
// "mornings are for work" is on screen, OFF once the evening starts. Flipping it jumps there.
// Under reduced motion or on phones the strip is a plain vertical stack and the foot bar hides.
//
// A client component ('use client'): the hook needs the browser's scroll position. The server
// still renders all of this markup, so the words are there before JavaScript runs.

type Scene = (typeof EVENING.scenes)[number];

// One sticker per scene, by EVENING.scenes id.
const ART: Record<Scene['id'], (props: { className?: string }) => JSX.Element> = {
  after: BackpackSticker, gym: BarbellSticker, cook: PanSticker, eat: TableSticker, study: BookSticker, someday: PotSticker,
};

// The flat band behind each panel, late afternoon to night: the intro, then the six scenes.
const BANDS = ['sky', 'apricot', 'sunset', 'dusk', 'berry', 'berry-deep', 'ink'] as const;

const shot = IMAGES[EVENING.shot];

function Voice({ text }: { text: string }) {
  return <>{parseTwoVoice(text).map((part, i) => (part.kw ? <em key={i} className="oc-kw">{part.text}</em> : part.text))}</>;
}

export default function OffClock() {
  const [on, setOn] = useState(true);
  // The switch reads ON until the intro has mostly slid away. setOn with an unchanged value is a
  // no-op in React, so calling it every frame re-renders only when the answer flips.
  const { runwayRef, trackRef, scrollToItem } = useHorizontalScroll(p => setOn(p < 0.06));
  const flip = (next: boolean) => { setOn(next); scrollToItem(next ? 0 : 1); };
  const n = EVENING.scenes.length;

  return (
    <section {...sectionAttrs('offclock')} ref={runwayRef} className="offclock" aria-labelledby="offclock-title">
      <div className="oc-frame">
        <div className="oc-track" ref={trackRef}>
          <article className="oc-panel oc-intro" data-band={BANDS[0]} data-hs-item="">
            <span className="eyebrow">{OFF_CLOCK.eyebrow}</span>
            <h2 id="offclock-title" className="oc-title">{OFF_CLOCK.title}</h2>
            <p className="oc-intro-line"><Voice text={EVENING.intro} /></p>
            <p className="oc-hint">{EVENING.hint}</p>
            <div className="oc-art" aria-hidden="true">
              <ClockSticker className="oc-st" />
              <SparkleSticker className="oc-spark" />
            </div>
            <span className="oc-ground" aria-hidden="true" />
          </article>
          {EVENING.scenes.map((scene, i) => {
            const Art = ART[scene.id];
            return (
              // --i staggers the sticker's bob; data-band paints the panel's colour (offclock.css).
              <article key={scene.id} className={`oc-panel oc-${scene.id}`} data-band={BANDS[i + 1]} data-hs-item="" aria-labelledby={`oc-${scene.id}-big`} style={{ '--i': i } as CSSProperties}>
                <div className="oc-copy">
                  <span className="oc-when">{scene.when}</span>
                  <h3 className="oc-big" id={`oc-${scene.id}-big`}>{scene.big}</h3>
                  <p className="oc-voice"><Voice text={scene.voice} /></p>
                  {scene.sub && <p className="oc-sub">{scene.sub}</p>}
                </div>
                {scene.id === 'study' && (
                  <figure className="oc-shot">
                    <img src={shot.sm} srcSet={`${shot.sm} ${shot.smW}w, ${shot.src} ${shot.w}w`} sizes="(min-width: 700px) 340px, 90vw" width={shot.w} height={shot.h} alt={shot.alt} loading="lazy" decoding="async" />
                    <figcaption>{EVENING.shotCaption}</figcaption>
                  </figure>
                )}
                <div className="oc-art" aria-hidden="true"><Art className="oc-st" /></div>
                <span className="oc-ground" aria-hidden="true" />
              </article>
            );
          })}
        </div>

        {/* The sky: a sun that rides an arc and becomes the moon past halfway. Decoration. */}
        <div className="oc-sky" aria-hidden="true">
          <span className="oc-orb"><SunSticker className="oc-sun" /><MoonSticker className="oc-moon" /></span>
        </div>

        {/* The foot bar: the clock switch, then the evening's progress line. */}
        <div className="oc-foot">
          <ClockSwitch id="oc-clock" label={EVENING.clock} onWord={FORK.on.voice} offWord={FORK.off.voice} on={on} onChange={flip} />
          <div className="oc-steps" aria-hidden="true">
            <span className="oc-steps-fill" />
            <ol>
              {EVENING.scenes.map((scene, i) => (
                <li key={scene.id} style={{ '--at': (i + 1) / n } as CSSProperties}>{scene.big}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
