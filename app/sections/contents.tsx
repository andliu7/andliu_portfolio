import { ArrowRight } from 'lucide-react';
import { CONTENTS, MICROCOPY, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { FlowButton } from '@/components/ui/flow-button';
import { TextBlockAnimation } from '@/components/ui/text-block-animation';
import { TiltFrame } from '@/components/site/tilt-frame';
import { MarylandIcon } from '@/components/site/umd/maryland-icon';
import { CompassSpin, FlipOnView } from './contents.client';
import { ROW_ICONS } from './contents-icons';
import './contents.css';

// The contents, right after the hero: late morning in "one day, scrolled" (Andrew 2026-11-03),
// so ink type straight on the pale blue sky. "Where to?", the short note, then ONE .ink-card
// (globals.css, the same object as the project fan cards) holding a numbered row per section on
// the page (CONTENTS.rows in lib/site.ts), two columns on a wide screen. The rows are lines inside
// that card, never cards of their own. Each row is a plain in-page link; the director's link
// delegate (app/motion.tsx) scrolls to it, and #island goes through the island's own delegate.
// The card tilts up into place as it scrolls in (Andrew 2026-10-06: "make the content page after
// the flag scroll up like this"), now a CSS view timeline instead of the old dark ContainerScroll
// frame, which put a card around a card.
// "WHERE TO?" is a FlipHeading (components/site/flip-heading.tsx): it rolls on hover and focus,
// and once when it scrolls into view (FlipOnView). Under the card, the hero's résumé button with a
// short line over it. The compass sticker (top left) spins when pressed (CompassSpin); Maryland
// (top right) tilts toward the pointer.
// A server component: the roll on view and the compass are the client pieces; the rest is CSS.

export default function Contents() {
  return (
    <section {...sectionAttrs('contents')} className="contents" aria-labelledby="contents-title">
      <CompassSpin label={CONTENTS.spin} />
      {/* The cartoon Maryland in the top right corner, tilting toward the pointer (it came from UMD's stop in
          Along the way, Andrew 2026-10-28). Decoration; wide screens only. */}
      <TiltFrame className="toc-state" max={14} shift={0} layers={[{ depth: 0, node: <MarylandIcon className="toc-state-svg" /> }]} />
      <FlipOnView id="contents-title" />
      <div className="toc-intro">
        <TextBlockAnimation as="span" className="eyebrow">{CONTENTS.eyebrow}</TextBlockAnimation>
        <FlipHeading id="contents-title" text={CONTENTS.title} href="#contents" fit={false} className="display toc-title" />
        <TextBlockAnimation as="p" className="toc-note" delay={0.2}>{CONTENTS.note}</TextBlockAnimation>
      </div>
      <nav className="toc-nav ink-card" aria-label={CONTENTS.label}>
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
                  <ArrowRight className="toc-arrow" size={20} aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="toc-cta">
        {/* Scrolls to the résumé preview rather than opening the PDF: a softer first step (Andrew 2026-10-07). */}
        <FlowButton href="#resume" text={MICROCOPY.resumeShort} />
      </div>
    </section>
  );
}
