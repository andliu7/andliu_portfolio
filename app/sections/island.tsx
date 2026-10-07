import { Play } from 'lucide-react';
import { IMAGES, ISLAND, MICROCOPY, sectionAttrs } from '@/lib/site';
import { IslandDoor } from './island.client';
import './island.css';
import { CornerStickers } from '@/components/site/corner-stickers/corner-stickers';

// The island finale (SITE-PLAN.md 4.10), the static version. One wide berry window standing on
// its own under the footer's marquee band: the title and tagline on the left, the island poster
// on the right, and "Go to the game?" as a real button. After it comes only the site footer
// (components/site/footer.tsx), which holds the copyright and credits.
// The NOTCH_TO_ISLAND tab and stem were removed in round 2 (they read as a glitch).
//
// The button is a plain link to the game's own page (ISLAND.src): the visitor chooses to go, the
// browser's Back brings them home, and nothing on this page loads the game until they click.
// The scroll-scrubbed window and the live preview in the plan are not built here; the game in
// island/ and public/island is untouched.
// The poster is a link too: island.client.tsx asks "Head to the island?" in a popup first.
// section#island is deliberately not a size container (app/globals.css, plan 2.3).

const poster = IMAGES[ISLAND.poster];

export default function Island() {
  return (
    <section {...sectionAttrs('island')} className="island" aria-labelledby="island-title">
      <CornerStickers set="island" />
      <div className="il-window" data-ground="berry">
        <div className="il-text">
          <span className="eyebrow">{ISLAND.eyebrow}</span>
          <h2 id="island-title" className="display il-title">
            <span className="fit-line">{ISLAND.titleTop}</span>
            <span className="fit-line">{ISLAND.titleBottom}</span>
          </h2>
          <p className="il-tagline">{ISLAND.tagline}</p>
          <a className="pill pill-light pill-big il-go" href={ISLAND.src}>
            <Play size={18} aria-hidden="true" /> {MICROCOPY.prompt}
          </a>
        </div>
        <figure className="il-shot">
          <IslandDoor>
            <img
              src={poster.srcset[0].src}
              srcSet={poster.srcset.map(s => `${s.src} ${s.w}w`).join(', ')}
              sizes="(min-width: 900px) 56vw, 92vw"
              width={poster.w} height={poster.h} alt={poster.alt}
              loading="lazy" decoding="async"
            />
          </IslandDoor>
        </figure>
      </div>
    </section>
  );
}
