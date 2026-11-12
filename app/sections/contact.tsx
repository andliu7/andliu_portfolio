import { ArrowLeft, ArrowUpRight, Mail } from 'lucide-react';
import { CONTACT, MICROCOPY, RESUME, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { FlipLink } from '@/components/ui/flip-links';
import { SocialButton, socialKind } from '@/components/site/social-button';
import { StackBand } from '@/components/site/stack-band';
import { ContactForm } from '@/components/site/contact-form';
import { TextBlockAnimation } from '@/components/ui/text-block-animation';
import { PillFaces } from '@/components/site/pill-faces';
import CopyEmail from '../copy-email';
import './contact.css';
import { ContactToys } from './contact.client';

// The contact page (SITE-PLAN.md 4.9). Rethink 2026-11-03 ("one day, scrolled"): contact is
// twilight, so nothing here is boxed but the letter. The eyebrow, the crushed headline and the
// one-tap way to reach him (the invitation, Email me and Copy email, the address, GitHub, LinkedIn
// and the résumé) stand straight on the berry sky in paper and apricot type. The form is the one
// card, a tilted sheet of letter paper (.ink-card, components/site/contact-form.tsx) with its own
// stamp and postmark. It used to be a blue form box inside a big apricot box; Andrew: it did not
// fit the rest of the site. The sitemap and copyright live in the site footer
// (components/site/footer.tsx). Each link appears once.
//
// FooterCard is exported for About; its signature is fixed:
//   variant 'home'   the page, then the "Résumé below" cue
//   variant 'about'  the page with a pill back to the home page (MICROCOPY.backHome), then the
//                    stack band, which has no other place on About

export function FooterCard({ variant }: { variant: 'home' | 'about' }) {
  const resume = CONTACT.links.find(link => link.href === RESUME);
  const mail = CONTACT.links.find(link => link.href.startsWith('mailto:'));
  const links = CONTACT.links.filter(link => link !== resume && link !== mail);
  // Email me and the address open a draft with the subject already filled in (2026-10-20).
  const mailto = `${mail?.href ?? `mailto:${CONTACT.email}`}?subject=${encodeURIComponent(CONTACT.mailSubject)}`;
  return (
    // A fragment (<>...</>): the page and what follows it are siblings in the section, no wrapper.
    <>
    {/* No fill and no data-ground: it takes the section's sky (berry at home, ink on About). */}
    <div className="ct-card">
      {variant === 'home' && <ContactToys />}
      <div className="ct-body">
        <TextBlockAnimation as="span" className="eyebrow">{CONTACT.eyebrow}</TextBlockAnimation>
        <FlipHeading id="contact-title" text={CONTACT.headline} max={170} />
        <div className="ct-split">
          {/* The quick way, on the sky: one column beside the letter on a wide screen, above it on a phone. */}
          <div className="ct-reach">
            <TextBlockAnimation as="p" className="ct-invite" delay={0.2}>{CONTACT.invite}</TextBlockAnimation>
            <div className="row-actions ct-actions">
              <a className="pill pill-berry press pill-big ct-cta" href={mailto}>
                {CONTACT.emailCta} <Mail size={20} aria-hidden="true" />
              </a>
              <CopyEmail email={CONTACT.email} />
            </div>
            <p className="ct-email">
              <a className="display ct-mail" href={mailto}>{CONTACT.email}</a>
            </p>
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
              {resume && (
                <li>
                  <a className="pill pill-light press ct-resume" href={resume.href} target="_blank" rel="noreferrer">
                    {resume.label} <ArrowUpRight size={18} aria-hidden="true" />
                  </a>
                </li>
              )}
            </ul>
          </div>
          {/* The letter. Sends through the Worker when its URL is set at build time
              (worker/CONTACT.md), through the visitor's mail app when not (contact-form.tsx). */}
          <ContactForm />
        </div>
      </div>
      {variant === 'about' && (
        <a className="pill pill-light ct-home" href="/"><ArrowLeft size={16} aria-hidden="true" /> {MICROCOPY.backHome}</a>
      )}
    </div>
    {variant === 'about' && <StackBand className="ct-band" />}
    {/* "Résumé below", the cue under the page: a pill and a bobbing arrow in apricot. Home only. */}
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
      {/* The first stars of the evening, carried on into the résumé's night sky (Andrew 2026-10-17:
          "basically the same background"). No fade here, so it runs on without a jump. */}
      {/* The frame: the page and the cue together (contact.css). */}
      <div className="ct-frame">
        <FooterCard variant="home" />
      </div>
    </section>
  );
}
