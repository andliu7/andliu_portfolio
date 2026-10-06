import type { CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { CURRENTLY, HERO, IDENTITY, IMAGES, PORTRAITS, RESUME, TICKET, MICROCOPY, sectionAttrs } from '@/lib/site';
import { Portrait } from '@/components/site/portrait';
import { Marquee } from '@/components/site/marquee';
import { BarbellSticker, BerryMotif, BlueberrySticker, FlashcardSticker, MoleculeSticker, PanSticker } from '@/components/site/stickers/stickers';
import { HeroFit } from './hero.client';
import './hero.css';

// The hero (SITE-PLAN.md 4.1) in the Slush poster language: a sky band outlined in ink, the
// name crushed as large as the band allows, a collage of flat stickers of Andrew's things
// overlapping its letters, and an ink marquee strip carrying the "currently:" lines.
//
// Layout (hero.css): the band's inner stage is a size container. The name is one line on a
// wide stage and two on a narrow one; HeroFit (hero.client.tsx) sizes it to fill the stage once
// the fonts have loaded, keeps the band above the fold, and pins each sticker to its letter.
// A big flat berry sits behind the type on the right, and under the name come the identity
// line, the résumé link and the NOW BUILDING ticket, then the marquee strip.
//
// The entrance is CSS only (hero.css): until the loader sets html.is-loaded, each letter waits
// a quarter em to the left, invisible; then they spring in, last letter first. The blocks rise
// after, and the stickers pop in from small and turned. With JavaScript off (no html.js) or
// reduced motion nothing is ever hidden. The h1 is server HTML (it is the LCP element) and reads
// "Andrew Liu" once: the letter spans are aria-hidden.
//
// There is no photo of Andrew yet. When PORTRAITS.hero.src is set the Portrait print joins the
// block beside LIU; until then the stickers are the picture.

// The ticket's reaction drawing, framed on the whole drawing rather than the file's canvas: its
// paths span x 26 to 313 and y 30 to 179 of the 340 by 210 file, so this box adds 10 units of
// even padding around that.
const TICKET_CROP = '16 20 307 169';

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

// Each sticker is a positioned slot (where it sits, its resting turn) around the art (which
// pops in and wiggles). --k orders the pop-in.
const STICKERS = [
  { key: 'berry', Art: BlueberrySticker },
  { key: 'mol', Art: MoleculeSticker },
  { key: 'card', Art: FlashcardSticker },
  { key: 'pan', Art: PanSticker },
  { key: 'bar', Art: BarbellSticker },
] as const;

export default function Hero() {
  const art = IMAGES[TICKET.art];
  return (
    <section {...sectionAttrs('top')} className="hero" aria-labelledby="hero-title">
      <div className="hero-band">
        <div className="hero-stage">
          <HeroFit />
          <div className="hero-motif" aria-hidden="true"><BerryMotif /></div>
          <span className="hero-tag hero-rise" style={{ '--d': 0 } as CSSProperties}>{HERO.eyebrow}</span>

          <div className="hero-namewrap">
            <h1 id="hero-title" className="display fit hero-name" style={{ '--chars': 6, '--max': '300px' } as CSSProperties}>
              <span className="sr-only">{IDENTITY.name}</span>
              <NameLine text={HERO.first} start={0} />
              <NameLine text={HERO.last} start={HERO.first.length} kw />
            </h1>
            <div className="hero-collage" aria-hidden="true">
              {STICKERS.map(({ key, Art }, k) => (
                <span key={key} className={`hero-st hero-st-${key}`} style={{ '--k': k } as CSSProperties}>
                  <Art className="hero-st-art" />
                </span>
              ))}
            </div>
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
            <a className="hero-ticket hero-rise" style={{ '--d': 2 } as CSSProperties} href={TICKET.href} target="_blank" rel="noreferrer">
              <span className="hero-ticket-eyebrow">{MICROCOPY.nowBuilding}</span>
              <span className="hero-ticket-body">
                <span className="hero-ticket-thumb">
                  <svg viewBox={TICKET_CROP} role="img" aria-label={art.alt} preserveAspectRatio="xMidYMid meet">
                    <image href={art.src} width={art.w} height={art.h} />
                  </svg>
                </span>
                <span className="hero-ticket-text">
                  <span className="hero-ticket-title">{TICKET.title}</span>
                  <span className="hero-ticket-line">{TICKET.role}</span>
                  <span className="hero-ticket-when">{TICKET.when}</span>
                </span>
              </span>
              <span className="hero-ticket-go">{MICROCOPY.visitBlueberry} <ArrowUpRight size={14} aria-hidden="true" /></span>
            </a>
            {PORTRAITS.hero.src ? <Portrait id="hero" className="hero-portrait hero-rise" /> : null}
          </div>
        </div>

        <div className="hero-strip hero-rise" style={{ '--d': 3 } as CSSProperties}>
          <span className="hero-strip-label">{MICROCOPY.currently}</span>
          <Marquee className="hero-mq" label={CURRENTLY.join('. ')} duration={45} fade={false}>
            {CURRENTLY.map(item => (
              <span className="hero-mq-item" key={item}>
                {item}
                <svg className="hero-mq-dot" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="5" /></svg>
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
