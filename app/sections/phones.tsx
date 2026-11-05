import { ArrowUpRight } from 'lucide-react';
import { PHONES, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { PillFaces } from '@/components/site/pill-faces';
import { TextBlockAnimation } from '@/components/ui/text-block-animation';
import { PhoneStage } from './phones.client';
import './phones.css';

// Blueberry on a phone (Andrew 2026-10-20: "for my projects I want a page of phone screens and
// updated pictures of blueberry"), at noon on the shared sky (rethink 2026-11-03: "one day,
// scrolled"). Rebuilt 2026-11-03 (Andrew: the hand of phones "feels like reusing the project
// carousel"): a feature list driving ONE phone, plus "Try it live".
//   1. head:  eyebrow, a crushed two-line headline, one short line and a pill to the live site
//   2. stage: the six features as a list beside one large phone that shows the selected screen,
//             or Blueberry itself once "Try it live" is pressed (phones.client.tsx). About one
//             screen tall on desktop; under 900px the list becomes chips above the phone.
// The chapter's stack strip hangs over this section's top edge (phones.css).
// The head is server rendered and handed to the stage as children, so it sits in the stage's
// grid (over the list on a wide screen) without becoming client code.

export default function Phones() {
  return (
    <section {...sectionAttrs('phones')} className="phones" aria-labelledby="phones-title">
      <PhoneStage shots={PHONES.shots} label={PHONES.label}>
        <div className="ph-head">
          <TextBlockAnimation as="span" className="eyebrow">{PHONES.eyebrow}</TextBlockAnimation>
          <FlipHeading id="phones-title" text={PHONES.headline} max={96} />
          <div className="ph-intro">
            <p className="ph-line" data-reveal="lines">{PHONES.line}</p>
            <a className="pill pill-berry ph-live" href={PHONES.href} target="_blank" rel="noreferrer">
              <PillFaces>{PHONES.link} <ArrowUpRight size={18} aria-hidden="true" /></PillFaces>
            </a>
          </div>
        </div>
      </PhoneStage>
    </section>
  );
}
