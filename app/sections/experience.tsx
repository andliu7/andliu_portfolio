'use client';
import type { CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { EXPERIENCE_HEAD, JOBS, MICROCOPY, RESUME, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { PillFaces } from '@/components/site/pill-faces';
import { useHorizontalScroll } from '@/components/site/use-horizontal-scroll';
import './experience.css';
import { CornerStickers } from '@/components/site/corner-stickers/corner-stickers';

// Experience, the timeline (rebuilt 2026-10-06 from the approved design, Timeline.dc.html).
// The section pins and vertical scroll slides the four roles left past a dated track, oldest to
// newest, with the résumé pill waiting at the end. The head row (eyebrow, heading, the scroll
// hint and a progress bar) stays put while the strip moves. The pin lives in
// components/site/use-horizontal-scroll.ts, which explains the sticky-runway pattern.
//
// Each role is a card filled with a pastel of the role's own tile colour (JOBS[].dot), its dates
// on an ink chip, then the role, the organisation and its JOBS line. Above each card, on the
// track, a dot and the month it started, derived from JOBS[].sort (yyyymm), so no date is typed
// twice. Under reduced motion or on phones it is a plain vertical list.
//
// A client component ('use client'): the hook reads the scroll position. The server still
// renders the whole list.

// Oldest first: the strip reads left to right through time.
const ROLES = [...JOBS].sort((a, b) => a.sort - b.sort);

// 202506.5 -> "Jun 2025". Month index from the yyyymm number; the CSS uppercases it.
const started = (sort: number) => {
  const year = Math.floor(sort / 100);
  const month = Math.floor(sort % 100) - 1;
  return new Date(year, month, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

export default function Experience() {
  const { runwayRef, trackRef } = useHorizontalScroll<HTMLOListElement>();

  return (
    <section {...sectionAttrs('experience')} ref={runwayRef} className="experience" aria-labelledby="experience-title">
      <div className="xp-frame">
        <CornerStickers set="experience" />
        <div className="xp-head">
          <div className="xp-head-text">
            <span className="eyebrow">{EXPERIENCE_HEAD.eyebrow}</span>
            <FlipHeading id="experience-title" text={EXPERIENCE_HEAD.headline} fit={false} className="display xp-title" />
          </div>
          <div className="xp-meter" aria-hidden="true">
            <span className="xp-hint">{EXPERIENCE_HEAD.hint}</span>
            <span className="xp-bar"><span className="xp-bar-fill" /></span>
          </div>
        </div>
        <ol className="xp-track" ref={trackRef}>
          {ROLES.map((job, i) => (
            // --dot is the role's tile token; the card's pastel is mixed from it in experience.css.
            <li key={job.id} className="xp-item" data-hs-item="" style={{ '--dot': `var(--${job.dot})`, '--i': i } as CSSProperties}>
              <span className="xp-tick" aria-hidden="true">{started(job.sort)}</span>
              <article className="xp-card" aria-labelledby={`xp-${job.id}`}>
                <span className="xp-when">{job.when}</span>
                <h3 className="xp-role" id={`xp-${job.id}`}>{job.role}</h3>
                <p className="xp-org">{job.org}</p>
                <p className="xp-line">{job.line}</p>
              </article>
            </li>
          ))}
          <li className="xp-item xp-end" data-hs-item="">
            <a className="pill pill-berry xp-resume" href={RESUME} target="_blank" rel="noreferrer">
              <PillFaces>{MICROCOPY.resume} <ArrowUpRight size={18} aria-hidden="true" /></PillFaces>
            </a>
          </li>
        </ol>
      </div>
    </section>
  );
}
