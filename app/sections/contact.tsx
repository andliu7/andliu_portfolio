import { ArrowLeft, ArrowUpRight, Mail } from 'lucide-react';
import { BB_HEAD, CONTACT, MICROCOPY, RESUME, STACK, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { FlipLink } from '@/components/ui/flip-links';
import { SocialButton, socialKind } from '@/components/site/social-button';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { StackChip } from '@/components/site/stack-logos';
import { ContactForm } from '@/components/site/contact-form';
import { TextBlockAnimation } from '@/components/ui/text-block-animation';
import { PillFaces } from '@/components/site/pill-faces';
import CopyEmail from '../copy-email';
import './contact.css';
import { ContactToys } from './contact.client';

// The footer card (SITE-PLAN.md 4.9) in the Slush look: one flat apricot card (no gradient),
// the headline crushed giant over a one-line invitation, GitHub and LinkedIn as big outlined pills
// (they open wider on hover to show the handle), the email address itself in display type as the
// mailto link, and "Email me" as the one berry button (Andrew 2026-10-07: "make it more of a
// contact me", "the second CTA so very important"); the résumé is the light pill beside the eyebrow. The sitemap and copyright live in the site footer
// (components/site/footer.tsx), not here. Each link appears
// once in the card. Under the card, the STACK runs as a sky band of logo chips that
// slides (components/ui/infinite-slider.tsx) and slows on hover; on the home page it is a strip of
// tape across the card's lower right corner (contact.css, 2026-10-12).
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
      {variant === 'home' && <ContactToys />}
      <div className="ct-body">
        <div className="ct-top">
          <TextBlockAnimation as="span" className="eyebrow">{CONTACT.eyebrow}</TextBlockAnimation>
          {resume && (
            <a className="pill pill-light press ct-resume" href={resume.href} target="_blank" rel="noreferrer">
              {resume.label} <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          )}
        </div>
        <FlipHeading id="contact-title" text={CONTACT.headline} max={170} />
        <TextBlockAnimation as="p" className="ct-invite" delay={0.2}>{CONTACT.invite}</TextBlockAnimation>
        {/* Two columns from a wide card up (Andrew 2026-10-12: "too much empty space"): the address
            and its buttons on the left, GitHub and LinkedIn on the right. One column on a phone. */}
        <div className="ct-row">
          <div className="ct-reach">
            <p className="ct-email">
              <a className="display ct-mail" href={mail?.href ?? `mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </p>
            <div className="row-actions ct-actions">
              <a className="pill pill-berry press pill-big ct-cta" href={mail?.href ?? `mailto:${CONTACT.email}`}>
                {CONTACT.emailCta} <Mail size={20} aria-hidden="true" />
              </a>
              <CopyEmail email={CONTACT.email} />
            </div>
            <p className="ct-note">{CONTACT.emailNote}</p>
            {/* Renders nothing unless the Worker URL is set at build time (worker/CONTACT.md). */}
            <ContactForm />
          </div>
          <ul className="ct-links">
              {links.map(link => {
                const kind = socialKind(link.href);
                return (
                  <li key={link.label} className="ct-pill">
                    {kind
                      ? <SocialButton className="ct-social" href={link.href} label={link.label} kind={kind} extra={CONTACT.handles[kind]} />
                      : <FlipLink href={link.href} external={link.external}>{link.label}</FlipLink>}
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
      {variant === 'about' && (
        <a className="pill pill-light ct-home" href="/"><ArrowLeft size={16} aria-hidden="true" /> {MICROCOPY.backHome}</a>
      )}
    </div>
    <div className="ct-mq">
      <InfiniteSlider label={BB_HEAD.stack} gap={16} duration={30} durationOnHover={110}>
        {STACK.map(item => <StackChip key={item} name={item} className="ct-mq-item" />)}
      </InfiniteSlider>
    </div>
    {/* "Résumé below", the cue under the card: UMD's "Contents below" (umd.tsx), same pill and
        bobbing arrow, in the card's apricot. Home only; About has no résumé under it. */}
    {variant === 'home' && (
      <div className="ct-cue">
        <a className="pill ct-down" href="#resume"><PillFaces>{CONTACT.down}</PillFaces></a>
        <svg className="ct-arrow" width="36" height="44" viewBox="0 0 36 44" aria-hidden="true">
          <path d="M18 2 V38 M4 26 L18 40 L32 26" fill="none" stroke="var(--apricot)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 2 V38 M4 26 L18 40 L32 26" fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )}
    </>
  );
}

export default function Contact() {
  return (
    <section {...sectionAttrs('contact')} className="contact" aria-labelledby="contact-title">
      {/* The frame: the card, the stack band and the cue together (contact.css). */}
      <div className="ct-frame">
        <FooterCard variant="home" />
      </div>
    </section>
  );
}
