import type { Metadata } from 'next';
import { ABOUT, CERTS, CURRENTLY, EDUCATION, IDENTITY, MICROCOPY, OFF_CLOCK, SKILLS } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { Portrait } from '@/components/site/portrait';
import { GradientGround } from '@/components/ui/gradient-backgrounds';
import Motion from '../motion';
import { FooterCard } from '../sections/contact';
import { SiteFooter } from '@/components/site/footer';

// STUB (foundation). The about piece replaces this file (about-us-section with its staggered
// reveals and count-ups, the static berry, the note portraits). Here: every About line from
// lib/site.ts as plain HTML, so the route exists and reads end to end (SITE-PLAN.md 5).

export const metadata: Metadata = {
  title: `${MICROCOPY.nav[3]}, ${IDENTITY.name}`, // assembled: "About, Andrew Liu" (sign-off list)
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <Motion />
      <section id="about" data-ground="paper" data-gradient="paper-apricot" data-texture="" className="about stub" aria-labelledby="about-title">
        <div className="stub-row">
          <div>
            <span className="eyebrow">{ABOUT.eyebrow}</span>
            <FlipHeading id="about-title" text={ABOUT.title} as="h1" max={160} />
            <p className="stub-currently"><span>{MICROCOPY.currently}</span> {CURRENTLY[0]}</p>
          </div>
          <div className="stub-about-portrait">
            <GradientGround gradient="paper-berry" className="stub-about-disc" />
            <Portrait id="about" />
          </div>
        </div>
        <p className="lead">{ABOUT.heading}</p>
        <ul className="stub-list stub-columns">
          {ABOUT.things.map(thing => (
            <li key={thing.title}><h2 className="stub-card-title">{thing.title}</h2><p>{thing.line}</p></li>
          ))}
        </ul>
        <ul className="stub-list stub-columns">
          {ABOUT.stats.map(stat => (
            <li key={stat.label}><span className="title">{stat.value.toLocaleString('en-US')}{stat.suffix}</span> {stat.label}</li>
          ))}
        </ul>
        <h2 className="stub-card-title">{ABOUT.educationTitle}</h2>
        <p>{EDUCATION.school}. {EDUCATION.degree}. {EDUCATION.expected}.</p>
        <p><span className="eyebrow">{EDUCATION.courseworkLabel}</span>{EDUCATION.coursework.join(', ')}</p>
        <p><span className="eyebrow">{EDUCATION.certsLabel}</span>{CERTS.map(cert => `${cert.name} (${cert.issuer})`).join(', ')}</p>
        <ul className="stub-list">
          {SKILLS.map(group => <li key={group.group}><span className="eyebrow">{group.group}</span>{group.items.join(', ')}</li>)}
        </ul>
        <h2 className="stub-card-title">{ABOUT.offTitle}</h2>
        <ul className="stub-notes">
          {OFF_CLOCK.notes.map(note => (
            <li key={note.portrait} className="card">
              <Portrait id={note.portrait} sizes="(min-width: 768px) 24vw, 80vw" />
              <p>{note.line}</p>
              {note.sub && <p className="stub-note-sub">{note.sub}</p>}
            </li>
          ))}
        </ul>
      </section>
      <section id="about-contact" data-ground="ink" data-texture="" className="contact">
        <FooterCard variant="about" />
      </section>
      <SiteFooter />
    </>
  );
}
