import type { CSSProperties } from 'react';
import { HERO, HERO_BAR, HERO_CAUTION, IDENTITY, PORTRAITS, RESUME, MICROCOPY, sectionAttrs } from '@/lib/site';
import { Portrait } from '@/components/site/portrait';
import { Marquee } from '@/components/site/marquee';
import { HeroObjects } from '@/components/site/hero-objects/hero-objects';
import Cloudscape from '@/components/ui/cloudscape';
import { FlowButton } from '@/components/ui/flow-button';
import { HeroFit, NameRoll } from './hero.client';
import './hero.css';

// The hero (SITE-PLAN.md 4.1) in the Slush poster language: Andrew's Cloudscape sky drifting
// edge to edge across the whole first screen (behind the header too), the title chip, the name crushed onto one line as
// wide as the band allows, four cartoon objects of his projects around it (each a link), the
// résumé button, then a cream marquee of short true facts on the seam, crossed by a caution tape.
//
// Layout (hero.css): the hero is one screen tall less half the bar, so on arrival the bar shows
// whole at the foot of the screen, on the seam with the next section. The band's inner stage is a
// size container. HeroFit (hero.client.tsx) sizes the name to fill the stage once the fonts have
// loaded and keeps the band and the room for the bar and tape above the seam inside the first
// screen on a wide screen. The objects are placed in units of that size
// (components/site/hero-objects), so they stay on the same letters at every width.
//
// The entrance is CSS only (hero.css): until the loader sets html.is-loaded, each letter waits
// a quarter em to the left, invisible; then they spring in, last letter first. The blocks rise
// after, and the objects fall in from above, tumbling, one by one. With JavaScript off (no html.js) or
// reduced motion nothing is ever hidden. The h1 is server HTML (it is the LCP element) and reads
// "Andrew Liu" once: the letter spans are aria-hidden. Every 6 to 9 seconds, and on hover, the
// letters roll over to a second face in the other voice's colour and back (NameRoll, hero.css).
//
// There is no photo of Andrew yet. When PORTRAITS.hero.src is set the Portrait print joins the
// foot beside the résumé button; until then the objects are the picture.

const NAME_CHARS = HERO.first.length + HERO.last.length;

// The tape's seconds per pass, set so it moves at about the cream bar's speed (its list is a
// shorter than the bar's, which takes 80s): both measured at about 43px a second.
const TAPE_SECONDS = 61;

function NameLine({ text, start, kw = false }: { text: string; start: number; kw?: boolean }) {
  return (
    <span className={`hero-nl ${kw ? 'hero-nl-kw' : ''}`} aria-hidden="true">
      {Array.from(text).map((char, i) => (
        // --i counts from the last letter, so the stagger runs right to left (Slush's entrance);
        // --j counts from the first, for the roll (NameRoll): the letter as set, its second face below
        <span key={i} className="hero-c" style={{ '--i': NAME_CHARS - 1 - (start + i), '--j': start + i } as CSSProperties}>
          <span className="hero-roll"><span className="hero-fa">{char}</span><span className="hero-fb">{char}</span></span>
        </span>
      ))}
    </span>
  );
}

export default function Hero() {
  return (
    <section {...sectionAttrs('top')} className="hero" aria-labelledby="hero-title">
      {/* Andrew's Cloudscape (components/ui/cloudscape.tsx) at its own sky colours, filling the whole first screen; decoration only */}
      <Cloudscape className="hero-sky" height="100%" aria-hidden="true" />
      {/* A second run of the caution tape, in from the right edge under the flashcards and down to
          the left, crossing the bottom tape and scrolling the other way. It lies under the band, so
          the name and objects draw over it, and its clip ends it at the seam (hero.css); HeroFit
          (hero.client.tsx) sets where it enters so it clears every object, label and the button. */}
      <div className="hero-tape-clip" aria-hidden="true">
        <div className="hero-tape hero-tape-right">
          <Marquee className="hero-tape-mq" label="" duration={TAPE_SECONDS} fade={false}>
            {HERO_CAUTION.warnings.map(warning => (
              <span className="hero-tape-item" key={warning.text}>
                <b className="hero-tape-word">{HERO_CAUTION.word}</b>
                <span className={'code' in warning ? 'hero-tape-code' : undefined}>{warning.text}</span>
              </span>
            ))}
          </Marquee>
        </div>
      </div>
      <div className="hero-band">
        <div className="hero-stage">
          <HeroFit />
          <NameRoll />
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
              <div className="row-actions">
                <FlowButton href={RESUME} text={MICROCOPY.resume} />
              </div>
            </div>
            {PORTRAITS.hero.src ? <Portrait id="hero" className="hero-portrait hero-rise" /> : null}
          </div>
        </div>
      </div>

      {/* The bar lies level on the seam with the UMD flag, full bleed, and the caution tape crosses
          it in an X mid-screen: both share one grid cell (hero.css), the tape's ends off screen */}
      <div className="hero-cross hero-rise" style={{ '--d': 2 } as CSSProperties}>
        <div className="hero-strip">
          <Marquee className="hero-mq" label={HERO_BAR.join('. ')} duration={80} fade={false}>
            {HERO_BAR.map(item => (
              <span className="hero-mq-item" key={item}>
                {item}
                <svg className="hero-mq-dot" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="5" /></svg>
              </span>
            ))}
          </Marquee>
        </div>
        <div className="hero-tape">
          <Marquee className="hero-tape-mq" label={HERO_CAUTION.warnings.map(w => `${HERO_CAUTION.word}: ${w.text}`).join('. ')} duration={TAPE_SECONDS} direction="right" fade={false}>
            {HERO_CAUTION.warnings.map(warning => (
              <span className="hero-tape-item" key={warning.text}>
                <b className="hero-tape-word">{HERO_CAUTION.word}</b>
                {/* a code line keeps its own case (hero.css .hero-tape-code) */}
                <span className={'code' in warning ? 'hero-tape-code' : undefined}>{warning.text}</span>
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
