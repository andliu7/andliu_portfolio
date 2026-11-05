'use client';
import { useEffect, type CSSProperties } from 'react';
import { ArrowDown } from 'lucide-react';
import { EXPERIENCE_HEAD, JOBS, JOB_LOGOS, MICROCOPY, STRIP, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { TextBlockAnimation } from '@/components/ui/text-block-animation';
import { PillFaces } from '@/components/site/pill-faces';
import { useHorizontalScroll } from '@/components/site/use-horizontal-scroll';
import { EscHint, autoplayOn, setAutoplay } from '@/components/site/strip-autoplay';
import './experience.css';
import { BlobPerson, type PersonTone } from '@/components/site/closing/stickers';
import { UmdStop } from './experience.umd';

// Experience, the timeline. Rebuilt 2026-11-03 for "one day, scrolled": this section sits at dusk
// and reads as a timeline, not a deck (Andrew: "I want it to seem more of a timeline, whereas the
// projects are still ongoing and don't necessarily have a timeline").
//
// One ink line runs through the whole strip. Each stop on it has a pin and its dates above the
// line, and the role hangs from the pin on a short string as an .ink-card (globals.css, the same
// object as the project fan cards): a flat fill from JOBS[].dot, a slight tilt that alternates, the
// ink lip. A year chip sits on the line where the year turns, derived from JOBS[].sort (yyyymm), so
// no year is typed twice. The island's people stand on the line over their stop. The line ends at
// a last pin, Today, with the résumé pill hanging from it.
//
// The section pins and vertical scroll slides the strip left (components/site/use-horizontal-scroll.ts
// explains the sticky runway); it holds on the first stop for a stretch before sliding. The foot
// of the pinned frame is the progress bar and Skip section; any key skips too (the hook). Under
// reduced motion nothing pins and the same markup is a vertical timeline, the line down the left.
//
// Cut on 2026-11-03: the red auto-play button, and auto-play itself (it glided the strip on after
// 3/4 of a second of stillness, which is exactly what reading a card looks like, and Skip plus
// any key already get you past); the corner clock and briefcase stickers (hidden while pinned
// anyway); the scroll hint (the moving line says it); the date chip inside each card (the dates
// now live on the line, once).

// The island's round people standing on the line over each stop (Andrew 2026-10-17: "little
// characters from the island game"), the same BlobPerson the evening reel uses.
const CROWD: Record<(typeof JOBS)[number]['id'], { tone: PersonTone; tall?: boolean; extra?: 'book' }[]> = {
  blueberry: [{ tone: 'violet', tall: true }, { tone: 'sky' }, { tone: 'pink' }, { tone: 'teal', tall: true }],
  minnodi: [{ tone: 'teal', tall: true }],
  educationone: [{ tone: 'apricot', tall: true, extra: 'book' }, { tone: 'pink' }, { tone: 'leaf' }],
  kcm: [{ tone: 'gold', tall: true }, { tone: 'pink', extra: 'book' }, { tone: 'sky', extra: 'book' }, { tone: 'leaf', extra: 'book' }],
};

// Oldest first: the strip reads left to right through time.
const ROLES = [...JOBS].sort((a, b) => a.sort - b.sort);
const year = (sort: number) => Math.floor(sort / 100);
// The cards hang a little crooked, alternating, as stickers do (UMD, the first stop, is -1deg).
const TILTS = ['1.2deg', '-1.4deg', '0.9deg', '-1.1deg'];

export default function Experience() {
  // hold: 0.8 of a screen of scroll on the first stop before the strip moves.
  const { runwayRef, trackRef, pinned, scrollPast } = useHorizontalScroll<HTMLOListElement>(undefined, { hold: 0.8 });
  // Auto-play off (see the cut list above). The setting is shared and this is the only strip left.
  useEffect(() => { if (autoplayOn()) setAutoplay(false); }, []);

  return (
    <section {...sectionAttrs('experience')} ref={runwayRef} className="experience" aria-labelledby="experience-title">
      <div className="xp-frame">
        <div className="xp-head">
          <TextBlockAnimation as="span" className="eyebrow">{EXPERIENCE_HEAD.eyebrow}</TextBlockAnimation>
          <FlipHeading id="experience-title" text={EXPERIENCE_HEAD.headline} fit={false} className="display xp-title" />
        </div>
        <ol className="xp-track" ref={trackRef}>
          <UmdStop />
          {ROLES.map((job, i) => {
            const turn = i === 0 || year(ROLES[i - 1].sort) !== year(job.sort);
            const logo = JOB_LOGOS[job.id];
            return (
              <li key={job.id} className="xp-item" data-hs-item="" style={{ '--hang': TILTS[i % TILTS.length] } as CSSProperties}>
                <div className="xp-stop" aria-hidden="true">
                  {turn && <span className="xp-year">{year(job.sort)}</span>}
                  <span className="xp-pin" data-fill={job.dot} />
                  <span className="xp-date">{job.when}</span>
                  <span className="xp-crowd">{CROWD[job.id].map((p, k) => <BlobPerson key={k} {...p} />)}</span>
                </div>
                <article className="xp-card ink-card" data-fill={job.dot} aria-labelledby={`xp-${job.id}`}>
                  {/* The employer's logo as a sticker on the card's top right (Andrew 2026-10-28), a link where JOB_LOGOS has one */}
                  {logo && (logo.href
                    ? <a className="xp-card-logo" href={logo.href} target="_blank" rel="noreferrer" aria-label={logo.label}><img src={logo.src} alt="" loading="lazy" decoding="async" /></a>
                    : <span className="xp-card-logo"><img src={logo.src} alt={logo.label} loading="lazy" decoding="async" /></span>)}
                  {/* The dates are on the line above (aria-hidden there); readers get them here */}
                  <span className="sr-only">{job.when}. </span>
                  <h3 className="xp-role" id={`xp-${job.id}`}>{job.role}</h3>
                  <p className="xp-org">{job.org}</p>
                  {/* only KCM has a gloss: what the name means, since the hero bar points here */}
                  {'gloss' in job && <p className="xp-gloss">{job.gloss}</p>}
                  <p className="xp-line">{job.line}</p>
                </article>
              </li>
            );
          })}
          {/* The line ends here, at today, and the next step hangs from it */}
          <li className="xp-item xp-end" data-hs-item="">
            <div className="xp-stop" aria-hidden="true">
              <span className="xp-pin xp-pin-now" />
              <span className="xp-date">{EXPERIENCE_HEAD.now}</span>
            </div>
            <a className="pill pill-berry xp-resume" href="#resume">
              <PillFaces>{MICROCOPY.resumeShort} <ArrowDown size={18} aria-hidden="true" /></PillFaces>
            </a>
          </li>
        </ol>
        {/* The foot of the pinned frame: how far you are, and the way out */}
        {pinned && (
          <div className="xp-progress">
            <span className="xp-bar" aria-hidden="true"><span className="xp-bar-fill" /></span>
            <EscHint className="xp-esc" />
            <button type="button" className="pill pill-light xp-skip" onClick={scrollPast}>
              <PillFaces>{STRIP.skip} <ArrowDown size={16} aria-hidden="true" /></PillFaces>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
