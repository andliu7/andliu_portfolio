import { ArrowRight } from 'lucide-react';
import { CONTENTS, MICROCOPY, RESUME, sectionAttrs } from '@/lib/site';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { FlipHeading } from '@/components/site/flip-heading';
import { FlowButton } from '@/components/ui/flow-button';
import { CompassSpin, FlipOnView } from './contents.client';
import { ROW_ICONS } from './contents-icons';
import './contents.css';

// The contents (the approved Contents design, fp/project/Contents.dc.html), right after College
// Park, in the site's own palette: berry-deep ground, paper text, apricot numbers. "Where to?",
// the short note, then one big numbered row per section that is on the page now (CONTENTS.rows
// in lib/site.ts). Each row is a plain in-page link; the director's link delegate
// (app/motion.tsx) scrolls to it, and #island goes through the island's own delegate.
// The title sits over a dark card holding the rows, and the card scrolls up into place
// (Andrew 2026-10-06: "make the content page after the flag scroll up like this").
// "WHERE TO?" is a FlipHeading (components/site/flip-heading.tsx): it rolls on hover and focus,
// and once when it scrolls into view (FlipOnView). Under the card, a second résumé button (the
// hero's FlowButton) with a short line over it. In the top left corner, a compass sticker that
// spins when pressed (CompassSpin).
// The flashcards and laptop of the hero land beside rows 01 and 02 while this section is on
// screen (components/site/hero-objects/travel.tsx reads the rows' positions; nothing here).
// A server component: the scroll effect and the roll on view are the client pieces; the hover
// nudge is CSS.

export default function Contents() {
  return (
    <section {...sectionAttrs('contents')} className="contents" aria-labelledby="contents-title">
      <CompassSpin label={CONTENTS.spin} />
      <FlipOnView id="contents-title" />
      {/* ContainerScroll (components/ui/container-scroll-animation.tsx): the title rises and the
          card of rows tilts from 20deg to flat as the section scrolls up (flat under reduced
          motion). It is a client component; this section stays a server component around it. */}
      <ContainerScroll className="toc-scroll" titleComponent={(
        <div className="toc-intro">
          <span className="eyebrow">{CONTENTS.eyebrow}</span>
          <FlipHeading id="contents-title" text={CONTENTS.title} href="#contents" fit={false} className="display toc-title" />
          <p className="toc-note">{CONTENTS.note}</p>
        </div>
      )}>
        <nav className="toc-nav" aria-label={CONTENTS.label}>
          <ol className="toc-list">
            {CONTENTS.rows.map((row, i) => {
              const Icon = ROW_ICONS[row.href];
              return (
                <li key={row.href}>
                  <a className="toc-row" href={row.href}>
                    <span className="toc-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <span className={`toc-ic toc-ic-${row.href.slice(1)}`} aria-hidden="true">{Icon ? <Icon /> : null}</span>
                    <span className="toc-text">
                      <span className="toc-name">{row.title}</span>
                      <span className="toc-sub">{row.sub}</span>
                    </span>
                    <span className="toc-meta">{row.meta}</span>
                    <ArrowRight className="toc-arrow" size={22} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      </ContainerScroll>
      <div className="toc-cta">
        <p className="toc-cta-line">{CONTENTS.resumeLine}</p>
        <FlowButton href={RESUME} text={MICROCOPY.resume} />
      </div>
    </section>
  );
}
