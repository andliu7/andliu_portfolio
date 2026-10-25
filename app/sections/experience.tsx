'use client';
import type { CSSProperties } from 'react';
import { ArrowDown } from 'lucide-react';
import { EXPERIENCE_HEAD, JOBS, MICROCOPY, STRIP, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { TextBlockAnimation } from '@/components/ui/text-block-animation';
import { PillFaces } from '@/components/site/pill-faces';
import { useHorizontalScroll } from '@/components/site/use-horizontal-scroll';
import { AutoplayButton, EscHint } from '@/components/site/strip-autoplay';
import './experience.css';
import { CornerStickers } from '@/components/site/corner-stickers/corner-stickers';
import { BlobPerson, type PersonTone } from '@/components/site/closing/stickers';
import { UmdStop } from './experience.umd';

// Experience, the timeline (rebuilt 2026-10-06 from the approved design, Timeline.dc.html).
// The section pins and vertical scroll slides the stops left past a dated track: UMD first, then
// the four roles oldest to newest, with the résumé pill waiting at the end. The head row (eyebrow, heading, the scroll
// hint and a progress bar) stays put while the strip moves. The pin lives in
// components/site/use-horizontal-scroll.ts, which explains the sticky-runway pattern.
//
// Each role is a card filled with a pastel of the role's own tile colour (JOBS[].dot), its dates
// on an ink chip, then the role, the organisation and its JOBS line. Above each card, on the
// track, a dot and the month it started, derived from JOBS[].sort (yyyymm), so no date is typed
// twice. Under reduced motion it is a plain vertical list; phones pin too (2026-10-11).
//
// The way through (2026-10-07): while the strip pins, the Esc hint and the red/green auto-play
// button (components/site/strip-autoplay.tsx) sit at the head row's right. The hook does the gliding.
// Easier to get past (Andrew 2026-10-25: "along the way should be easier to skip ... make a button
// to skip the section and make the progress bar clearer and stuck at the bottom of the screen"):
// the progress bar is a full-width bar along the foot of the pinned frame, with a Skip section
// button at its end (the hook's scrollPast, what Esc does, but on touch too).
//
// The hand-off to Contact (2026-10-07): Contact's ground is ink, this one berry-deep. A soft
// gradient toward ink grows in along the frame's foot as the strip runs (experience.css), so the
// change of ground arrives prepared, not as a hard edge.
//
// UMD opens the strip (2026-10-20): the College Park section was retired and became one stop, the
// first (Andrew: "having umd be the first one"); experience.umd.tsx explains it. The strip holds
// on it for a stretch of scroll before sliding (Andrew: "it should hold at the first card for a
// moment"), the `hold` passed to the hook below.
//
// A client component ('use client'): the hook reads the scroll position. The server still
// renders the whole list.

// The island's round people standing on each card's top edge (Andrew 2026-10-17: "little
// characters from the island game"), the same BlobPerson the evening reel uses, in the tones of
// that job's island zone. Blueberry's team of four; one person for the remote internship; a tutor
// with a book and two students; a small Focus Family circle.
const CROWD: Record<(typeof JOBS)[number]['id'], { tone: PersonTone; tall?: boolean; extra?: 'book' }[]> = {
  blueberry: [{ tone: 'violet', tall: true }, { tone: 'sky' }, { tone: 'pink' }, { tone: 'teal', tall: true }],
  minnodi: [{ tone: 'teal', tall: true }],
  educationone: [{ tone: 'apricot', tall: true, extra: 'book' }, { tone: 'pink' }, { tone: 'leaf' }],
  kcm: [{ tone: 'gold', tall: true }, { tone: 'pink', extra: 'book' }, { tone: 'sky', extra: 'book' }, { tone: 'leaf', extra: 'book' }],
};

// Oldest first: the strip reads left to right through time.
const ROLES = [...JOBS].sort((a, b) => a.sort - b.sort);

// 202506.5 -> "Jun 2025". Month index from the yyyymm number; the CSS uppercases it.
const started = (sort: number) => {
  const year = Math.floor(sort / 100);
  const month = Math.floor(sort % 100) - 1;
  return new Date(year, month, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

export default function Experience() {
  // hold: 0.8 of a screen of scroll on the first stop before the strip moves.
  const { runwayRef, trackRef, pinned, scrollPast } = useHorizontalScroll<HTMLOListElement>(undefined, { hold: 0.8 });

  return (
    <section {...sectionAttrs('experience')} ref={runwayRef} className="experience" aria-labelledby="experience-title">
      <div className="xp-frame">
        <CornerStickers set="experience" />
        <div className="xp-head">
          <div className="xp-head-text">
            <TextBlockAnimation as="span" className="eyebrow">{EXPERIENCE_HEAD.eyebrow}</TextBlockAnimation>
            <FlipHeading id="experience-title" text={EXPERIENCE_HEAD.headline} fit={false} className="display xp-title" />
          </div>
          <div className="xp-side">
            <div className="xp-meter" aria-hidden="true">
              <span className="xp-hint">{EXPERIENCE_HEAD.hint}</span>
            </div>
            {/* Only while the strip pins: the Esc hint and the auto-play button (strip-autoplay.tsx). */}
            {pinned && <div className="xp-ctl"><EscHint /><AutoplayButton /></div>}
          </div>
        </div>
        <ol className="xp-track" ref={trackRef}>
          <UmdStop />
          {ROLES.map((job, i) => (
            // --dot is the role's tile token; the card's pastel is mixed from it in experience.css.
            <li key={job.id} className="xp-item" data-hs-item="" style={{ '--dot': `var(--${job.dot})`, '--i': i + 1 } as CSSProperties}>
              <span className="xp-tick" aria-hidden="true">{started(job.sort)}</span>
              <article className="xp-card" aria-labelledby={`xp-${job.id}`}>
                <span className="xp-crowd" aria-hidden="true">
                  {CROWD[job.id].map((p, k) => <BlobPerson key={k} {...p} />)}
                </span>
                <span className="xp-when">{job.when}</span>
                <h3 className="xp-role" id={`xp-${job.id}`}>{job.role}</h3>
                <p className="xp-org">{job.org}</p>
                {/* only KCM has a gloss: what the name means, since the hero bar points here */}
                {'gloss' in job && <p className="xp-gloss">{job.gloss}</p>}
                <p className="xp-line">{job.line}</p>
              </article>
            </li>
          ))}
          <li className="xp-item xp-end" data-hs-item="">
            <a className="pill pill-berry xp-resume" href="#resume">
              <PillFaces>{MICROCOPY.resumeShort} <ArrowDown size={18} aria-hidden="true" /></PillFaces>
            </a>
          </li>
        </ol>
        {/* The foot of the pinned frame (experience.css .xp-progress): the progress bar (--p from the
            hook) and, beside it, Skip section, so how far you are and the way out sit together */}
        <div className="xp-progress">
          <span className="xp-bar" aria-hidden="true"><span className="xp-bar-fill" /></span>
          {pinned && (
            <button type="button" className="pill pill-light xp-skip" onClick={scrollPast}>
              <PillFaces>{STRIP.skip} <ArrowDown size={16} aria-hidden="true" /></PillFaces>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
