'use client';
import { useEffect, useRef, useState, type CSSProperties, type JSX, type KeyboardEvent, type PointerEvent } from 'react';
import { EVENING, FORK, IMAGES, OFF_CLOCK, sectionAttrs, type ImageEntry } from '@/lib/site';
import { parseTwoVoice } from '@/components/site/type';
import { ClockSwitch } from '@/components/site/clock-switch';
import { useHorizontalScroll } from '@/components/site/use-horizontal-scroll';
import { BarbellSticker, PanSticker } from '@/components/site/stickers/stickers';
import { BackpackSticker, BlobPerson, BookSticker, ClockSticker, MoonSticker, PotSticker, SparkleSticker, SunSticker, TableSticker, type PersonTone } from '@/components/site/closing/stickers';
import './offclock.css';
import { CornerStickers } from '@/components/site/corner-stickers/corner-stickers';

// Off the clock (rebuilt 2026-10-06 from Andrew's note: "take me through my evening ... a
// horizontal scroll with more animated feeling"). The section pins and vertical scroll walks a
// strip through his evening, in his order: the intro ("mornings are for work"), after work or
// classes, the gym, cook (with the UMD garden line: the garden fuels the cooking), eat, Bible
// study, and a last "someday" panel that keeps landscape design. Every scene but the first holds
// a small framed shot of the matching place in his island game (EVENING.shots: the Home Gym, the Kitchen, its table, the
// Focus Family Circle room, the plaza outdoors). The pin itself lives in components/site/use-horizontal-scroll.ts, which explains it.
//
// Time of day: each panel is a flat band of colour, late afternoon (sky) to night (ink), so the
// ground darkens as you scroll. No gradient wash (Andrew is unsure about gradients). In the foot
// bar a progress line names each scene, and a sun rides an arc along it, turning into the moon
// past halfway. The sun is also the strip's handle (Andrew 2026-10-06): drag it and the page
// scrolls to match, or focus it and step scene by scene with the arrow keys (role="slider").
// Everything that moves reads the scroll progress from one CSS variable, --p, set by the hook.
// Each scene has a few of the island's round people in it (friends at the gym, someone cooking
// with him, the Bible study group), bobbing and blinking under full motion.
//
// The way out (Andrew felt stuck in the strip): a small OFF THE CLOCK tag stays at the top once the
// intro has slid away, "Skip the evening" in the foot bar jumps past the section, and the clock
// switch jumps to either end: ON to the intro's "mornings are for work", OFF to the last scene.
// Under reduced motion or on phones the strip is a plain vertical stack and the foot bar hides.
//
// A client component ('use client'): the hook needs the browser's scroll position. The server
// still renders all of this markup, so the words are there before JavaScript runs.

type Scene = (typeof EVENING.scenes)[number];

// COOK's art: the pan with a herb pot beside it, since the garden fuels the cooking (Andrew
// 2026-10-06). The pot is not given className, so only the pan bobs. <>...</> is a Fragment:
// it returns two siblings without adding a wrapper element.
function CookArt({ className }: { className?: string }) {
  return <><PotSticker className="oc-herb" /><PanSticker className={className} /></>;
}

// One sticker per scene, by EVENING.scenes id.
const ART: Record<Scene['id'], (props: { className?: string }) => JSX.Element> = {
  after: BackpackSticker, gym: BarbellSticker, cook: CookArt, eat: TableSticker, study: BookSticker, someday: PotSticker,
};

// The flat band behind each panel, late afternoon to night: the intro, then the six scenes.
const BANDS = ['sky', 'apricot', 'sunset', 'dusk', 'berry', 'berry-deep', 'ink'] as const;

// The round people standing in each scene, left of its sticker.
const CROWD: Record<Scene['id'], { tone: PersonTone; tall?: boolean; extra?: 'band' | 'chef' | 'book' }[]> = {
  after: [{ tone: 'gold' }],
  gym: [{ tone: 'pink', tall: true, extra: 'band' }, { tone: 'teal', extra: 'band' }],
  cook: [{ tone: 'sky', tall: true, extra: 'chef' }, { tone: 'apricot' }],
  eat: [{ tone: 'leaf' }],
  study: [{ tone: 'pink', extra: 'book' }, { tone: 'apricot', tall: true, extra: 'book' }, { tone: 'teal', extra: 'book' }],
  someday: [{ tone: 'leaf', tall: true }],
};

// The scenes' island shots by scene id. Widened to a Partial record so a scene without one reads
// as undefined instead of a type error.
const SHOTS: Partial<Record<Scene['id'], { image: keyof typeof IMAGES; caption: string }>> = EVENING.shots;

function Voice({ text }: { text: string }) {
  return <>{parseTwoVoice(text).map((part, i) => (part.kw ? <em key={i} className="oc-kw">{part.text}</em> : part.text))}</>;
}

// One scene's round people. Each gets --k so their bobs and blinks fall out of step.
function Crowd({ id }: { id: Scene['id'] }) {
  return (
    <div className="oc-crowd" aria-hidden="true">
      {CROWD[id].map((who, k) => <span key={k} className="oc-who" style={{ '--k': k } as CSSProperties}><BlobPerson {...who} /></span>)}
    </div>
  );
}

export default function OffClock() {
  const n = EVENING.scenes.length;
  const [on, setOn] = useState(true);
  const [at, setAt] = useState(0); // the stop (0 intro, 1..n scenes) nearest the strip's progress
  const stops = useRef<number[]>([]); // each stop's progress 0..1, measured from the layout
  const aim = useRef<number | null>(null); // the stop the arrow keys are gliding to, if any
  const grab = useRef<number | null>(null); // while dragging: pointer x minus the sun's centre
  const barRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLSpanElement>(null);

  // The switch reads ON until the intro has mostly slid away. setOn and setAt with an unchanged
  // value are no-ops in React, so calling them every frame re-renders only when an answer flips.
  const { runwayRef, trackRef, pinned, progressOf, scrollToProgress, scrollPast } = useHorizontalScroll(p => {
    setOn(p < 0.06);
    const s = stops.current;
    if (!s.length) return;
    let best = 0;
    s.forEach((q, i) => { if (Math.abs(q - p) < Math.abs(s[best] - p)) best = i; });
    setAt(best);
    if (aim.current !== null && Math.abs(s[aim.current] - p) < 0.01) aim.current = null;
  });

  // Measure the stops after layout and again on resize. The deps re-run it when the strip pins.
  useEffect(() => {
    const measure = () => { stops.current = Array.from({ length: n + 1 }, (_, i) => progressOf(i)); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pinned, n, progressOf]);

  const flip = (next: boolean) => { setOn(next); aim.current = null; scrollToProgress(next ? 0 : 1); };

  // Drag: the bar captures the pointer (setPointerCapture), so the drag keeps tracking even when
  // the pointer leaves the bar, and each move scrolls the page straight to the matching point.
  const seek = (x: number) => {
    const box = barRef.current?.getBoundingClientRect();
    if (box && grab.current !== null) scrollToProgress((x - grab.current - box.left) / box.width, true);
  };
  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const sun = sunRef.current?.getBoundingClientRect();
    const onSun = sun && event.clientX >= sun.left && event.clientX <= sun.right && event.clientY >= sun.top && event.clientY <= sun.bottom;
    grab.current = sun && onSun ? event.clientX - (sun.left + sun.width / 2) : 0;
    aim.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    seek(event.clientX);
  };
  const onMove = (event: PointerEvent<HTMLDivElement>) => seek(event.clientX);
  const onUp = () => { grab.current = null; };

  // Keyboard: the arrows step one scene (right and up go later), Home and End jump to the ends.
  // Repeated presses step on from the stop already being glided to, not from where the strip is.
  const onKey = (event: KeyboardEvent<HTMLSpanElement>) => {
    const from = aim.current ?? at;
    const steps: Record<string, number> = { ArrowRight: from + 1, ArrowUp: from + 1, PageDown: from + 1, ArrowLeft: from - 1, ArrowDown: from - 1, PageUp: from - 1, Home: 0, End: n };
    const to = steps[event.key];
    if (to === undefined) return;
    event.preventDefault();
    const next = Math.min(n, Math.max(0, to));
    aim.current = next;
    scrollToProgress(stops.current[next] ?? progressOf(next), false, 0.7);
  };

  return (
    <section {...sectionAttrs('offclock')} ref={runwayRef} className="offclock" aria-labelledby="offclock-title">
      <div className="oc-frame">
        <CornerStickers set="offclock" />
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
            const shot = SHOTS[scene.id];
            const img: ImageEntry | null = shot ? IMAGES[shot.image] : null;
            return (
              // --i staggers the sticker's bob; data-band paints the panel's colour (offclock.css).
              <article key={scene.id} className={`oc-panel oc-${scene.id}${shot ? ' oc-has-shot' : ''}`} data-band={BANDS[i + 1]} data-hs-item="" aria-labelledby={`oc-${scene.id}-big`} style={{ '--i': i } as CSSProperties}>
                <div className="oc-copy">
                  <span className="oc-when">{scene.when}</span>
                  <h3 className="oc-big" id={`oc-${scene.id}-big`}>{scene.big}</h3>
                  <p className="oc-voice"><Voice text={scene.voice} /></p>
                  {scene.sub && <p className="oc-sub">{scene.sub}</p>}
                </div>
                {shot && img && (
                  <figure className="oc-shot">
                    <img src={img.sm ?? img.src} srcSet={`${img.sm ?? img.src} ${img.smW ?? img.w}w, ${img.src} ${img.w}w`} sizes="(min-width: 700px) 340px, 90vw" width={img.w} height={img.h} alt={img.alt} loading="lazy" decoding="async" />
                    <figcaption>{shot.caption}</figcaption>
                  </figure>
                )}
                <Crowd id={scene.id} />
                <div className="oc-art" aria-hidden="true"><Art className="oc-st" /></div>
                <span className="oc-ground" aria-hidden="true" />
              </article>
            );
          })}
        </div>

        {/* The section's name, kept in view once the intro's big title has slid away. */}
        <p className="oc-pin-title" aria-hidden="true">{OFF_CLOCK.title}</p>

        {/* The foot bar: the clock switch, the evening's line with the sun on it, the way out. */}
        <div className="oc-foot">
          <ClockSwitch id="oc-clock" label={EVENING.clock} onWord={FORK.on.voice} offWord={FORK.off.voice} on={on} onChange={flip} />
          <div className="oc-steps" ref={barRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <span className="oc-steps-fill" aria-hidden="true" />
            <ol aria-hidden="true">
              {EVENING.scenes.map((scene, i) => (
                <li key={scene.id} style={{ '--at': (i + 1) / n } as CSSProperties}>{scene.big}</li>
              ))}
            </ol>
            <span
              ref={sunRef} className="oc-orb" tabIndex={pinned ? 0 : -1} role="slider" aria-label={EVENING.slider}
              aria-valuemin={0} aria-valuemax={n} aria-valuenow={at} aria-valuetext={at ? EVENING.scenes[at - 1].when : OFF_CLOCK.title}
              aria-orientation="horizontal" onKeyDown={onKey}
            >
              <SunSticker className="oc-sun" /><MoonSticker className="oc-moon" />
            </span>
          </div>
          <button type="button" className="pill pill-berry oc-skip" onClick={scrollPast}>{EVENING.skip}</button>
        </div>
      </div>
    </section>
  );
}
