import { ArrowRight } from 'lucide-react';
import { CONTENTS, sectionAttrs } from '@/lib/site';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import './contents.css';

// The contents (the approved Contents design, fp/project/Contents.dc.html), right after College
// Park, in the site's own palette: berry-deep ground, paper text, apricot numbers. "Where to?",
// the short note, then one big numbered row per section that is on the page now (CONTENTS.rows
// in lib/site.ts). Each row is a plain in-page link; the director's link delegate
// (app/motion.tsx) scrolls to it, and #island goes through the island's own delegate.
// The title sits over a dark card holding the rows, and the card scrolls up into place
// (Andrew 2026-10-06: "make the content page after the flag scroll up like this").
// A server component: the scroll effect is the one client piece; the hover nudge is CSS.

export default function Contents() {
  return (
    <section {...sectionAttrs('contents')} className="contents" aria-labelledby="contents-title">
      {/* ContainerScroll (components/ui/container-scroll-animation.tsx): the title rises and the
          card of rows tilts from 20deg to flat as the section scrolls up (flat under reduced
          motion). It is a client component; this section stays a server component around it. */}
      <ContainerScroll className="toc-scroll" titleComponent={(
        <div className="toc-intro">
          <span className="eyebrow">{CONTENTS.eyebrow}</span>
          <h2 id="contents-title" className="display toc-title">{CONTENTS.title}</h2>
          <p className="toc-note">{CONTENTS.note}</p>
        </div>
      )}>
        <nav className="toc-nav" aria-label={CONTENTS.label}>
          <ol className="toc-list">
            {CONTENTS.rows.map((row, i) => (
              <li key={row.href}>
                <a className="toc-row" href={row.href}>
                  <span className="toc-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="toc-text">
                    <span className="toc-name">{row.title}</span>
                    <span className="toc-sub">{row.sub}</span>
                  </span>
                  <span className="toc-meta">{row.meta}</span>
                  <ArrowRight className="toc-arrow" size={22} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </ContainerScroll>
    </section>
  );
}
