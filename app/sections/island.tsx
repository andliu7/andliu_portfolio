import { Play } from 'lucide-react';
import { IMAGES, ISLAND, MICROCOPY, OFF_CLOCK, sectionAttrs } from '@/lib/site';
import { IslandDoor } from '@/components/site/closing/island-door';
import { EveningReel } from '@/components/site/closing/evening-reel';
import { CornerStickers } from '@/components/site/corner-stickers/corner-stickers';
import './island.css';

// The island finale, the page's last section (rebuilt 2026-10-07). It absorbed Off the clock:
// Andrew dropped that pinned strip ("we already have a horizontal scroll") but kept its round
// characters, which now act out his evening in a small carousel (EveningReel) under the button.
//
// One wide berry window: the title, the tagline and "Go to the game?" (a plain link to the game's
// own page, ISLAND.src) and the evening reel on the left, the island poster on the right. The poster
// is a link too, but it asks "Head to the island?" first (IslandDoor). After this
// comes only the site footer (components/site/footer.tsx), which the page slides up off.
// A server component: the door and the reel are the client pieces inside it.

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
          {/* Off the clock, small, under the button in the left column, with a small title in the
              display font like FOR REAL (Andrew 2026-10-07). */}
          <div className="il-evening">
            <h3 className="il-evening-title">{OFF_CLOCK.title}</h3>
            <EveningReel />
          </div>
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
