import type { CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { BLUEBERRY, BLUEBERRY_CHAPTER, MICROCOPY, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { FlashcardSticker, MoleculeSticker } from '@/components/site/stickers/stickers';
import { DiveFit } from './dive.client';
import './dive.css';

// The dive into Blueberry (SITE-PLAN.md 4.3), the chapter head, as a poster on a flat berry
// band: an outlined tag, the headline stacked in three crushed lines with a flashcard and a
// molecule stuck over the end of CHEMISTRY (the two things the sell names), then the sell and
// the two doors in one column under it.
//
// The headline uses BLUEBERRY_CHAPTER.headlineLines, the same words with line breaks; screen
// readers still get one sentence. DiveFit (dive.client.tsx) sizes it once the fonts load.

export default function Dive() {
  return (
    <section {...sectionAttrs('dive')} className="dive curve-top" aria-labelledby="dive-title">
      <div className="dv-inner">
        <span className="dv-tag">{BLUEBERRY_CHAPTER.eyebrow}</span>
        <div className="dv-head" data-reveal>
          <DiveFit />
          <FlipHeading id="dive-title" text={BLUEBERRY_CHAPTER.headlineLines} max={128} className="dv-title" />
          <div className="dv-collage" aria-hidden="true">
            <span className="dv-st dv-st-card" style={{ '--k': 0 } as CSSProperties}><FlashcardSticker className="dv-st-art" /></span>
            <span className="dv-st dv-st-mol" style={{ '--k': 1 } as CSSProperties}><MoleculeSticker className="dv-st-art" /></span>
          </div>
        </div>
        <div className="dv-body">
          <p className="dv-sell" data-reveal="lines">{BLUEBERRY_CHAPTER.sell}</p>
          <div className="dv-cta" data-reveal>
            <div className="row-actions">
              <a className="pill pill-berry press" href={BLUEBERRY.live} target="_blank" rel="noreferrer">{MICROCOPY.visitBlueberry} <ArrowUpRight size={16} aria-hidden="true" /></a>
              <a className="pill pill-light" href={BLUEBERRY.source} target="_blank" rel="noreferrer">{MICROCOPY.source} <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
            <p className="dv-note">{BLUEBERRY_CHAPTER.ctaNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
