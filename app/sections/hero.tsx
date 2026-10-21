import type { CSSProperties } from 'react';
import { Baloo_2 } from 'next/font/google';
import { HERO, HERO_BAR, HERO_CAUTION, IDENTITY, MICROCOPY, sectionAttrs } from '@/lib/site';
import { Marquee } from '@/components/site/marquee';
import { HeroObjects } from '@/components/site/hero-objects/hero-objects';
import Cloudscape from '@/components/ui/cloudscape';
import { FlowButton } from '@/components/ui/flow-button';
import { ChipMarquee } from '@/components/site/chip-marquee';
import { HeroFx, Follow } from './hero.client';
import './hero.css';
import './hero-photo.css';

// The hero (Andrew 2026-10-21, picked on the /draft page): the cloud sky with a soft cream scrim,
// "Hi, my name is", the name in Baloo 2 (A N D and L I U deep blue, R E W lighter), his
// black-and-white cut-out centred behind the name and drifting with the pointer, SOFTWARE
// ENGINEER, the résumé button, then the cream fact bar on the seam. The four project objects
// orbit him (icons A); /draft keeps the name-corners placement (icons D) in case he changes his
// mind, so HeroPanel takes the placement and is shared with that page.
//
// It reuses the old hero's pieces as they were: hero.css lays out the sky, the degree chip's look
// (here under the role, docking into the header on scroll), the objects' room, the foot and the bar, and
// keeps the letter roll and the LIU to 刘 flip (hero-photo.css adds the photo layout). The h1 is
// server HTML (the LCP element) and reads "Andrew Liu" once: the letter spans are aria-hidden.
// HeroFx (hero.client.tsx) fits the name and runs the roll and the flip; Follow is the drift.

const baloo = Baloo_2({ weight: ['800'], variable: '--font-baloo', subsets: ['latin'], display: 'swap' });

// Only the CJK glyphs of his surname, from Google Fonts' text= subset (a few KB). React 19 hoists
// a <link rel="stylesheet"> with `precedence` into the document head.
const ZH_FONT = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@900&text=%E5%88%98%E5%8A%89&display=swap';

// The bar's list: the facts, with a caution box after each of the first four
type BarItem = { text: string; caution?: boolean; code?: boolean };
const BAR_ITEMS: BarItem[] = HERO_BAR.flatMap((text, i): BarItem[] => {
  const caution = HERO_CAUTION[i];
  return caution ? [{ text }, { ...caution, caution: true }] : [{ text }];
});

// golden-gate-cutout.webp is a background-removed cut-out of golden-gate.webp, trimmed to him.
// Black and white is CSS (hero-photo.css, grayscale).
const CUTOUT = { src: '/images/me/golden-gate-cutout.webp', w: 421, h: 465 };

// Where the four objects go (hero-photo.css places each from the panel's data-icons):
//   a  orbit: tucked round him like stickers on the cut-out's edges, drifting with him (the hero)
//   d  the name block's outer corners (kept on /draft)
export type Icons = 'a' | 'd';

const NAME_CHARS = HERO.first.length + HERO.last.length;

// One line of the name, letters as hero.css expects them (.hero-c, .hero-roll, two faces) so the
// roll applies. `tones` picks each letter's blue: d deep, l light.
function Letters({ text, start, tones }: { text: string; start: number; tones: string }) {
  return Array.from(text).map((char, i) => (
    <span key={i} className={`hero-c hp-${tones[i]}`} style={{ '--i': NAME_CHARS - 1 - (start + i), '--j': start + i } as CSSProperties}>
      <span className="hero-roll"><span className="hero-fa">{char}</span><span className="hero-fb">{char}</span></span>
    </span>
  ));
}

export function HeroPanel({ icons, tag, main = false }: { icons: Icons; tag?: string; main?: boolean }) {
  const Heading = main ? 'h1' : 'h2';
  return (
    <section {...(main ? sectionAttrs('top') : {})} className={`hero hp hp-panel ${baloo.variable}`} data-icons={icons} aria-labelledby={main ? 'hero-title' : undefined} aria-label={main ? undefined : tag}>
      <link rel="stylesheet" href={ZH_FONT} precedence="default" />
      <HeroFx />
      {/* Andrew's Cloudscape (components/ui/cloudscape.tsx) at its own sky colours; decoration only */}
      <Cloudscape className="hero-sky" height="100%" aria-hidden="true" />
      <div className="hp-scrim" aria-hidden="true" />
      {tag && <p className="hp-tag">{tag}</p>}
      <div className="hero-band">
        <div className="hp-stage">
          <div className="hero-card">
            <p className="hp-hi hero-rise" style={{ '--d': 0 } as CSSProperties}>{HERO.hi}</p>
            <div className="hero-namewrap">
              {/* Each layer drifts with the pointer at its own depth (Follow): ANDREW against it,
                  him most, LIU a little, so they part like depth */}
              <Heading id={main ? 'hero-title' : undefined} className="hero-name hp-name">
                <span className="sr-only">{IDENTITY.name}</span>
                <Follow depth={-6} className="hero-nl hp-back">
                  <span aria-hidden="true"><Letters text={HERO.first} start={0} tones="dddlll" /></span>
                </Follow>
                {/* The gap between the words; the photo is centred on the whole name, behind every letter */}
                <span className="hp-gap" aria-hidden="true">
                  <Follow depth={14} className="hp-photo">
                    <img className="hp-cut" src={CUTOUT.src} width={CUTOUT.w} height={CUTOUT.h} alt="" decoding="async" />
                  </Follow>
                </span>
                {/* LIU, which flips to 刘 under the pointer (hero.css .hero-liu) */}
                <Follow depth={8} className="hero-nl hero-nl-kw hp-front">
                  <span aria-hidden="true">
                    <span className="hero-liu">
                      <span className="hero-liu-track">
                        <Letters text={HERO.last} start={HERO.first.length} tones="ddd" />
                        <span className="hero-zh" lang="zh">{HERO.lastZh}</span>
                      </span>
                    </span>
                    <span className="hp-comma">{HERO.comma}</span>
                  </span>
                </Follow>
              </Heading>
              {/* a: the stickers ride on his layer, so they drift with him, not with the letters */}
              {icons === 'a' && <Follow depth={14} className="hp-icons"><HeroObjects /></Follow>}
              {icons === 'd' && <HeroObjects />}
            </div>
            <div className="hero-foot hp-foot">
              <p className="hp-role hero-rise" style={{ '--d': 1 } as CSSProperties}>{HERO.role}</p>
              {/* The degree line between the role and the button, at every width (Andrew 2026-10-21);
                  once it scrolls up under the header, the header shows its own copy (header.tsx
                  finds it by .hp-degree) */}
              <span className="hero-tag hp-degree hero-rise" style={{ '--d': 1 } as CSSProperties}><ChipMarquee text={HERO.chip} /></span>
              <div className="hero-about hero-rise" style={{ '--d': 1 } as CSSProperties}>
                {/* Scrolls to the résumé preview rather than opening the PDF: a softer first step (Andrew 2026-10-07). /draft has none, so it opens the home page's. */}
                <FlowButton href={main ? '#resume' : '/#resume'} text={MICROCOPY.resumeShort} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The bar lies level on the seam with the next section, full bleed (hero.css) */}
      <div className="hero-strip hero-rise" style={{ '--d': 2 } as CSSProperties}>
        <Marquee className="hero-mq" label={BAR_ITEMS.map(item => item.text).join('. ')} duration={120} fade={false}>
          {BAR_ITEMS.map(item => (
            <span className="hero-mq-item" key={item.text}>
              {/* a caution line is a small boxed label; a code line keeps its own case */}
              {item.caution ? <span className={item.code ? 'hero-mq-box hero-mq-code' : 'hero-mq-box'}>{item.text}</span> : item.text}
              <svg className="hero-mq-dot" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="5" /></svg>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

export default function Hero() {
  return <HeroPanel icons="a" main />;
}
