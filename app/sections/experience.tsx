import type { CSSProperties, JSX } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { EXPERIENCE_HEAD, JOBS, MICROCOPY, RESUME, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { FlashcardSticker } from '@/components/site/stickers/stickers';
import { ClockSticker } from '@/components/site/closing/stickers';
import './experience.css';

// Experience (SITE-PLAN.md 4.7): the four roles on one 1440x900 screen.
// Top: the eyebrow, the heading in one giant line, and the résumé pill at the row's end.
// Below: the roles as four Slush cards in a 2x2 grid, each filled with a pale wash of the role's
// own tile colour and outlined in ink, its dates on a sticker in the full tile colour, and, for
// some roles, a sticker of the role's own thing over its corner. On phones it is one column of cards.
//
// A server component: plain markup. Motion is CSS: each card carries data-reveal, so the director
// (app/motion.tsx) adds .is-in on enter, and experience.css pops the sticker when it does.

// A sticker for some roles, by JOBS id: Minnodi a clock (remote, across time zones), Kharis a
// flashcard (the guides he writes). Blueberry and Education One have none on purpose (Andrew,
// 2026-10-06: less Blueberry, no chemistry art), so the map is Partial and a role may skip it.
const STICKERS: Partial<Record<string, (props: { className?: string }) => JSX.Element>> = { minnodi: ClockSticker, kcm: FlashcardSticker };

export default function Experience() {
  return (
    <section {...sectionAttrs('experience')} className="experience" aria-labelledby="experience-title">
      <div className="xp-head">
        <div className="xp-head-text">
          <span className="eyebrow">{EXPERIENCE_HEAD.eyebrow}</span>
          <FlipHeading id="experience-title" text={EXPERIENCE_HEAD.headline} fit={false} className="display xp-title" />
        </div>
        <a className="pill pill-light pill-big xp-resume" href={RESUME} target="_blank" rel="noreferrer">
          {MICROCOPY.resume} <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </div>
      <ol className="xp-list">
        {JOBS.map((job, i) => {
          const Sticker = STICKERS[job.id];
          return (
          // --dot is the role's own tile token; --i staggers the sticker pop card by card.
          // data-ground="paper" hands the card ink text and a berry keyword colour.
          <li key={job.id} className="xp-card" data-ground="paper" data-reveal="" style={{ '--dot': `var(--${job.dot})`, '--i': i } as CSSProperties}>
            <span className="xp-when">{job.when}</span>
            <h3 className="xp-role">
              <span className="display">{job.role}</span> <span className="xp-org">{job.org}</span>
            </h3>
            <p className="xp-line">{job.line}</p>
            {Sticker && <Sticker className="xp-sticker" />}
          </li>
          );
        })}
      </ol>
    </section>
  );
}
