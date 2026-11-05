import Motion from './motion';
import Hero from './sections/hero';
import Contents from './sections/contents';
import Phones from './sections/phones';
import Projects from './sections/projects';
import Experience from './sections/experience';
import Island from './sections/island';
import Contact from './sections/contact';
import Resume from './sections/resume';
import { SiteFooter } from '@/components/site/footer';
import Ground from '@/components/site/ground';

// The landing page (SITE-PLAN.md 1.1): the director, then the sections in SECTIONS order
// (lib/site.ts), then the one site footer, which the page slides up off (components/site/footer.tsx). Each section is its own file under app/sections/ with its own CSS, so pieces
// can be built and debugged one at a time. This file is a server component: plain HTML with the
// real copy, readable with JavaScript off; motion layers on after hydration.

export default function Home() {
  return (
    <>
      <Motion />
      <Hero />
      {/* "From flashcards to a platform" (the Blueberry chapter) is cut and "Where to?" is back (Andrew 2026-10-29); Blueberry lives on in the phones and the work list */}
      <Contents />
      <Phones />
      <Projects />
      {/* Measured impact and the stack strip live in the project captions now (2026-11-03, "one
          day, scrolled"): each project shows its own numbers and its own stack, said once. */}
      <Experience />
      <Contact />
      <Resume />
      <Island />
      <SiteFooter />
      {/* The one ground under every section, hero to footer (components/site/ground.tsx). After the
          footer in the page so it paints over the footer's sticky layer and under everything else. */}
      <Ground />
    </>
  );
}
