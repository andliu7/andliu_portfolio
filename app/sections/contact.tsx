import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { CONTACT, FOOTER, MICROCOPY, RESUME, STACK, sectionAttrs } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { FlipLink } from '@/components/ui/flip-links';
import { Marquee } from '@/components/site/marquee';
import CopyEmail from '../copy-email';
import './contact.css';

// The footer card (SITE-PLAN.md 4.9) in the Slush look: one flat apricot card (no gradient),
// the headline crushed giant, GitHub and LinkedIn as big outlined pills, the email address itself
// in display type as the mailto link, the Pages sitemap as small pills on the right, and the
// résumé as the one berry button so it is the first thing a recruiter finds. Each link appears
// once in the card. Under the card, the STACK marquee runs as a full-bleed sky band.
//
// FooterCard is exported for About; its signature is fixed:
//   variant 'home'   the card, then the marquee band. The NOTCH_TO_ISLAND tab is gone (round 2:
//                    the island window now stands on its own below the band)
//   variant 'about'  the same, plus a pill back to the home page (MICROCOPY.backHome)

export function FooterCard({ variant }: { variant: 'home' | 'about' }) {
  // On About the in-page targets live on the home page.
  const at = (href: string) => (variant === 'about' && href.startsWith('#') ? `/${href}` : href);
  const resume = CONTACT.links.find(link => link.href === RESUME);
  const mail = CONTACT.links.find(link => link.href.startsWith('mailto:'));
  const links = CONTACT.links.filter(link => link !== resume && link !== mail);
  const pages = FOOTER.columns[0]; // Pages; Elsewhere repeated GitHub, LinkedIn and the résumé
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
              {links.map(link => (
                <li key={link.label} className="ct-pill">
                  <FlipLink href={link.href} external={link.external}>{link.label}</FlipLink>
                </li>
              ))}
            </ul>
            <p className="ct-email">
              <a className="display ct-mail" href={mail?.href ?? `mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              <CopyEmail email={CONTACT.email} />
            </p>
            <p className="ct-note">{CONTACT.emailNote}</p>
          </div>
          <nav className="ct-cols" aria-label={pages.title}>
            <span className="eyebrow">{pages.title}</span>
            <ul>
              {pages.links.map(link => <li key={link.label}><a className="ct-site" href={at(link.href)}>{link.label}</a></li>)}
            </ul>
          </nav>
        </div>
      </div>
      {variant === 'about' && (
        <a className="pill pill-light ct-home" href="/"><ArrowLeft size={16} aria-hidden="true" /> {MICROCOPY.backHome}</a>
      )}
    </div>
    <Marquee className="ct-mq" label={STACK.join(', ')} duration={45} fade={false}>
      {STACK.map(item => <span className="ct-mq-item" key={item}>{item}</span>)}
    </Marquee>
    </>
  );
}

export default function Contact() {
  return (
    <section {...sectionAttrs('contact')} className="contact" aria-labelledby="contact-title">
      <FooterCard variant="home" />
    </section>
  );
}
