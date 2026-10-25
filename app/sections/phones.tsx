import { ArrowUpRight } from 'lucide-react';
import { PHONES, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { PillFaces } from '@/components/site/pill-faces';
import { TextBlockAnimation } from '@/components/ui/text-block-animation';
import { PhoneColumns } from './phones.client';
import './phones.css';

// Blueberry on a phone, right after the chapter (Andrew 2026-10-20: "for my projects I want a
// page of phone screens and updated pictures of blueberry"). Six captures in PHONES (lib/site.ts),
// the most important screens (Andrew 2026-10-20: "only include the most important screens ... it
// should be rather quick"), stand in phone frames drawn in CSS, in two rows of three columns
// (Andrew 2026-10-21: "the phones should have at least two rows (three columns) ... make it
// larger") that drift against each other as you scroll: the side columns up together, the
// centre column down, faster, so the grid stays mirrored
// (the opposing-column scroll he remembered from landonorris.com; the live site's nearest
// relative is its helmet grid, so this follows the Codrops and Bramus builds of the pattern).
//   1. head:    eyebrow, a crushed two-line headline, one short line and a pill to the live site
//   2. gallery: the phones (phones.client.tsx), full bleed (Andrew 2026-10-20: "needs to span
//               the full page width"), as large as the screen allows: three across from a
//               tablet up, two across on a phone (phones.css)
// The chapter's stack strip hangs over this section's top edge (phones.css).
// A server component: the gallery is the only client part. With JavaScript off, or under
// reduced motion, it is a still, staggered grid.

export default function Phones() {
  return (
    <section {...sectionAttrs('phones')} className="phones" aria-labelledby="phones-title">
      <div className="ph-head">
        <TextBlockAnimation as="span" className="eyebrow">{PHONES.eyebrow}</TextBlockAnimation>
        <FlipHeading id="phones-title" text={PHONES.headline} max={150} />
        <div className="ph-intro">
          <p className="ph-line" data-reveal="lines">{PHONES.line}</p>
          <a className="pill pill-berry ph-live" href={PHONES.href} target="_blank" rel="noreferrer">
            <PillFaces>{PHONES.link} <ArrowUpRight size={18} aria-hidden="true" /></PillFaces>
          </a>
        </div>
      </div>
      <PhoneColumns shots={PHONES.shots} label={PHONES.label} />
    </section>
  );
}
