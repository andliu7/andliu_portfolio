import type { CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { HERO, HERO_BAR, IDENTITY, PORTRAITS, RESUME, MICROCOPY, sectionAttrs } from '@/lib/site';
import { Portrait } from '@/components/site/portrait';
import { Marquee } from '@/components/site/marquee';
import { HeroObjects } from '@/components/site/hero-objects/hero-objects';
import Cloudscape from '@/components/ui/cloudscape';
import { HeroFit } from './hero.client';
import './hero.css';

// The hero (SITE-PLAN.md 4.1) in the Slush poster language: a band outlined in ink with
// Andrew's Cloudscape sky drifting behind it, the title chip, the name crushed onto one line as
// wide as the band allows, four cartoon objects of his projects around it (each a link), the
// identity line and the résumé button, then a tilted cream marquee of short true facts.
//
// Layout (hero.css): the band's inner stage is a size container. HeroFit (hero.client.tsx) sizes
// the name to fill the stage once the fonts have loaded and keeps the band and the bar above
// the fold on a wide screen. The objects are placed in units of that size
// (components/site/hero-objects), so they stay on the same letters at every width.
//
// The entrance is CSS only (hero.css): until the loader sets html.is-loaded, each letter waits
// a quarter em to the left, invisible; then they spring in, last letter first. The blocks rise
// after, and the objects pop in from small and turned. With JavaScript off (no html.js) or
// reduced motion nothing is ever hidden. The h1 is server HTML (it is the LCP element) and reads
// "Andrew Liu" once: the letter spans are aria-hidden.
//
// There is no photo of Andrew yet. When PORTRAITS.hero.src is set the Portrait print joins the
// foot beside the identity line; until then the objects are the picture.

const NAME_CHARS = HERO.first.length + HERO.last.length;

function NameLine({ text, start, kw = false }: { text: string; start: number; kw?: boolean }) {
  return (
    <span className={`hero-nl ${kw ? 'hero-nl-kw' : ''}`} aria-hidden="true">
      {Array.from(text).map((char, i) => (
        // --i counts from the last letter, so the stagger runs right to left (Slush's entrance)
        <span key={i} className="hero-c" style={{ '--i': NAME_CHARS - 1 - (start + i) } as CSSProperties}>{char}</span>
      ))}
    </span>
  );
}

export default function Hero() {
  return (
    <section {...sectionAttrs('top')} className="hero" aria-labelledby="hero-title">
      <div className="hero-band">
        {/* Andrew's Cloudscape (components/ui/cloudscape.tsx) at its own sky colours; decoration only */}
        <Cloudscape className="hero-sky" height="100%" aria-hidden="true" />
        <div className="hero-stage">
          <HeroFit />
          <span className="hero-tag hero-rise" style={{ '--d': 0 } as CSSProperties}>{HERO.chip}</span>

          <div className="hero-namewrap">
            <h1 id="hero-title" className="display fit hero-name" style={{ '--chars': 6, '--max': '300px' } as CSSProperties}>
              <span className="sr-only">{IDENTITY.name}</span>
              <NameLine text={HERO.first} start={0} />
              <NameLine text={HERO.last} start={HERO.first.length} kw />
            </h1>
            <HeroObjects />
          </div>

          <div className="hero-foot">
            <div className="hero-about hero-rise" style={{ '--d': 1 } as CSSProperties}>
              <p className="hero-lead">{HERO.identity}</p>
              <div className="row-actions">
                <a className="pill pill-berry press" href={RESUME} target="_blank" rel="noreferrer">
                  {MICROCOPY.resume} <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
            {PORTRAITS.hero.src ? <Portrait id="hero" className="hero-portrait hero-rise" /> : null}
          </div>
        </div>
      </div>

      {/* The bar sits outside the band so it can run full bleed; tilted, its corners hang past the viewport */}
      <div className="hero-strip hero-rise" style={{ '--d': 2 } as CSSProperties}>
        <Marquee className="hero-mq" label={HERO_BAR.join('. ')} duration={80} fade={false}>
          {HERO_BAR.map(item => (
            <span className="hero-mq-item" key={item}>
              {item}
              <svg className="hero-mq-dot" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="5" /></svg>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
