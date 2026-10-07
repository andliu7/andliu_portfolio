import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { BB_HEAD, CONTACT, MICROCOPY, RESUME, STACK, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { FlipLink } from '@/components/ui/flip-links';
import { SocialButton, socialKind } from '@/components/site/social-button';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { StackChip } from '@/components/site/stack-logos';
import { ContactForm } from '@/components/site/contact-form';
import CopyEmail from '../copy-email';
import './contact.css';
import { CornerStickers } from '@/components/site/corner-stickers/corner-stickers';

// The footer card (SITE-PLAN.md 4.9) in the Slush look: one flat apricot card (no gradient),
// the headline crushed giant, GitHub and LinkedIn as big outlined pills, the email address itself
// in display type as the mailto link, and the résumé as the one berry button so it is the first
// thing a recruiter finds. The sitemap and copyright live in the site footer
// (components/site/footer.tsx), not here. Each link appears
// once in the card. Under the card, the STACK runs as a full-bleed sky band of logo chips that
// slides (components/ui/infinite-slider.tsx) and slows on hover.
//
// FooterCard is exported for About; its signature is fixed:
//   variant 'home'   the card, then the marquee band. The NOTCH_TO_ISLAND tab is gone (round 2:
//                    the island window now stands on its own below the band)
//   variant 'about'  the same, plus a pill back to the home page (MICROCOPY.backHome)

export function FooterCard({ variant }: { variant: 'home' | 'about' }) {
  const resume = CONTACT.links.find(link => link.href === RESUME);
  const mail = CONTACT.links.find(link => link.href.startsWith('mailto:'));
  const links = CONTACT.links.filter(link => link !== resume && link !== mail);
  return (
    // A fragment (<>...</>): the card and the band are two siblings in the section, no wrapper.
    <>
    <div className="ct-card" data-ground="apricot">
      <div className="ct-body">
        <div className="ct-top">
          <span className="eyebrow">{CONTACT.eyebrow}</span>
          {resume && (
            <a className="pill pill-berry press pill-big ct-resume" href={resume.href} target="_blank" rel="noreferrer">
              {resume.label} <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          )}
        </div>
        <FlipHeading id="contact-title" text={CONTACT.headline} max={170} />
        <div className="ct-row">
          <div className="ct-reach">
            <ul className="ct-links">
              {links.map(link => {
                const kind = socialKind(link.href);
                return (
                  <li key={link.label} className="ct-pill">
                    {kind
                      ? <SocialButton className="ct-social" href={link.href} label={link.label} kind={kind} />
                      : <FlipLink href={link.href} external={link.external}>{link.label}</FlipLink>}
                  </li>
                );
              })}
            </ul>
            <p className="ct-email">
              <a className="display ct-mail" href={mail?.href ?? `mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              <CopyEmail email={CONTACT.email} />
            </p>
            <p className="ct-note">{CONTACT.emailNote}</p>
            {/* Renders nothing unless the Worker URL is set at build time (worker/CONTACT.md). */}
            <ContactForm />
          </div>
        </div>
      </div>
      {variant === 'about' && (
        <a className="pill pill-light ct-home" href="/"><ArrowLeft size={16} aria-hidden="true" /> {MICROCOPY.backHome}</a>
      )}
    </div>
    <div className="ct-mq">
      <InfiniteSlider label={BB_HEAD.stack} gap={16} duration={55} durationOnHover={140}>
        {STACK.map(item => <StackChip key={item} name={item} className="ct-mq-item" />)}
      </InfiniteSlider>
    </div>
    </>
  );
}

export default function Contact() {
  return (
    <section {...sectionAttrs('contact')} className="contact" aria-labelledby="contact-title">
      <CornerStickers set="contact" />
      <FooterCard variant="home" />
    </section>
  );
}
