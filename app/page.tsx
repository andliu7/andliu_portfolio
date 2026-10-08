import Motion from './motion';
import Hero from './sections/hero';
import Umd from './sections/umd';
import Contents from './sections/contents';
import Blueberry from './sections/blueberry';
import Projects from './sections/projects';
import Impact from './sections/impact';
import Experience from './sections/experience';
import Island from './sections/island';
import Contact from './sections/contact';
import Resume from './sections/resume';
import { SiteFooter } from '@/components/site/footer';
import ContourBg from '@/components/site/contour-bg';
import { AfterLoad } from '@/components/site/after-load';

// The landing page (SITE-PLAN.md 1.1): the director, then the sections in SECTIONS order
// (lib/site.ts), then the one site footer, which the page slides up off (components/site/footer.tsx). Each section is its own file under app/sections/ with its own CSS, so pieces
// can be built and debugged one at a time. This file is a server component: plain HTML with the
// real copy, readable with JavaScript off; motion layers on after hydration.

export default function Home() {
  return (
    <>
      <Motion />
      {/* AfterLoad: the contour canvases start once the loader lifts (components/site/after-load.tsx) */}
      <AfterLoad><ContourBg /></AfterLoad>
      <Hero />
      <Umd />
      <Contents />
      <Blueberry />
      <Projects />
      <Impact />
      <Experience />
      <Contact />
      <Resume />
      <Island />
      <SiteFooter />
    </>
  );
}
