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
import { StarsBackground } from '@/components/ui/stars';

// The footer card (SITE-PLAN.md 4.9) in the Slush look: one flat apricot card (no gradient),
// the headline crushed giant over a one-line invitation, GitHub and LinkedIn as big outlined pills
// (they open wider on hover to show the handle), the email address itself in display type as the
// mailto link, and "Email me" as the one berry button (Andrew 2026-10-07: "make it more of a
// contact me", "the second CTA so very important"); the résumé is the light pill beside the eyebrow.
// On 2026-10-20 it became a page of its own (Andrew: "the let's compare notes can be expanded to a
// page"): on the home page the card fills the screen and the contact form, always shown now, is
// its centrepiece, in its own full-width part under the one-tap row (Andrew 2026-10-20: "needs
// to be wider. like lower it to it's own part"). The sitemap and copyright live in the site footer
// (components/site/footer.tsx), not here. Each link appears
// once in the card. The stack band that used to cross the card's lower right corner as tilted tape
// now runs straight between Projects and Impact (components/site/stack-band.tsx, Andrew
// 2026-10-20); only About still shows it, under its card.
//
// FooterCard is exported for About; its signature is fixed:
//   variant 'home'   the card, then the "Résumé below" cue. The NOTCH_TO_ISLAND tab is gone
//                    (round 2: the island window now stands on its own)
//   variant 'about'  the card with a pill back to the home page (MICROCOPY.backHome), then the
//                    stack band, which has no other place on About

export function FooterCard({ variant }: { variant: 'home' | 'about' }) {
  const resume = CONTACT.links.find(link => link.href === RESUME);
  const mail = CONTACT.links.find(link => link.href.startsWith('mailto:'));
  const links = CONTACT.links.filter(link => link !== resume && link !== mail);
  // Email me and the address open a draft with the subject already filled in (2026-10-20).
  const mailto = `${mail?.href ?? `mailto:${CONTACT.email}`}?subject=${encodeURIComponent(CONTACT.mailSubject)}`;
  return (
    // A fragment (<>...</>): the card and what follows it are siblings in the section, no wrapper.
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
        {/* The one-tap way first, since it is the fastest (Email me, Copy email, the address, then
            GitHub and LinkedIn), across the card in one row from a wide card up. The form has its
            own full-width part under it (Andrew 2026-10-20: "the contact email sending part needs
            to be wider. like lower it to it's own part"); it used to be a narrow right column. */}
        <div className="ct-reach">
          <span className="eyebrow ct-quick">{CONTACT.quick}</span>
          <div className="row-actions ct-actions">
            <a className="pill pill-berry press pill-big ct-cta" href={mailto}>
              {CONTACT.emailCta} <Mail size={20} aria-hidden="true" />
            </a>
            <CopyEmail email={CONTACT.email} />
          </div>
          <p className="ct-email">
            <a className="display ct-mail" href={mailto}>{CONTACT.email}</a>
          </p>
          <p className="ct-note">{CONTACT.emailNote}</p>
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
        {/* Sends through the Worker when its URL is set at build time (worker/CONTACT.md),
            through the visitor's mail app when not (contact-form.tsx). */}
        <ContactForm />
      </div>
      {variant === 'about' && (
        <a className="pill pill-light ct-home" href="/"><ArrowLeft size={16} aria-hidden="true" /> {MICROCOPY.backHome}</a>
      )}
    </div>
    {variant === 'about' && <StackBand className="ct-band" />}
    {/* "Résumé below", the cue under the card: a pill and a bobbing arrow in the card's apricot.
        Home only; About has no résumé under it. */}
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
      {/* The résumé's night sky, carried up behind the card (Andrew 2026-10-17: "basically the same
          background"). No fade here, so it runs on into the résumé's sky without a jump. */}
      <StarsBackground fade={false} />
      {/* The frame: the card and the cue together (contact.css). */}
      <div className="ct-frame">
        <FooterCard variant="home" />
      </div>
    </section>
  );
}
