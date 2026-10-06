import Motion from './motion';
import Hero from './sections/hero';
import Manifesto from './sections/manifesto';
import Dive from './sections/dive';
import Blueberry from './sections/blueberry';
import Projects from './sections/projects';
import Impact from './sections/impact';
import Experience from './sections/experience';
import OffClock from './sections/offclock';
import Contact from './sections/contact';
import Island from './sections/island';

// The landing page (SITE-PLAN.md 1.1): the director, then the ten sections in SECTIONS order
// (lib/site.ts). Each section is its own file under app/sections/ with its own CSS, so pieces
// can be built and debugged one at a time. This file is a server component: plain HTML with the
// real copy, readable with JavaScript off; motion layers on after hydration.

export default function Home() {
  return (
    <>
      <Motion />
      <Hero />
      <Manifesto />
      <Dive />
      <Blueberry />
      <Projects />
      <Impact />
      <Experience />
      <OffClock />
      <Contact />
      <Island />
    </>
  );
}
