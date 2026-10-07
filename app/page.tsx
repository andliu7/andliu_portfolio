import Motion from './motion';
import Hero from './sections/hero';
import Umd from './sections/umd';
import Contents from './sections/contents';
import Blueberry from './sections/blueberry';
import Projects from './sections/projects';
import Impact from './sections/impact';
import Experience from './sections/experience';
import OffClock from './sections/offclock';
import Contact from './sections/contact';
import Island from './sections/island';
import { SiteFooter } from '@/components/site/footer';

// The landing page (SITE-PLAN.md 1.1): the director, then the ten sections in SECTIONS order
// (lib/site.ts), then the one site footer, which the page slides up off (components/site/footer.tsx). Each section is its own file under app/sections/ with its own CSS, so pieces
// can be built and debugged one at a time. This file is a server component: plain HTML with the
// real copy, readable with JavaScript off; motion layers on after hydration.

export default function Home() {
  return (
    <>
      <Motion />
      <Hero />
      <Umd />
      <Contents />
      <Blueberry />
      <Projects />
      <Impact />
      <Experience />
      <OffClock />
      <Contact />
      <Island />
      <SiteFooter />
    </>
  );
}
