import { Play } from 'lucide-react';
import { ISLAND, MICROCOPY, sectionAttrs } from '@/lib/site';
import { IslandDoor } from '@/components/site/closing/island-door';
import { IslandStage } from '@/components/site/island3d/island-stage';
import './island.css';

// The island finale, the page's last section, at deep night (rebuilt 2026-11-03, "one day,
// scrolled"). No window, no panel: the title, the tagline and "Go to the game?" (a plain link to
// the game's own page, ISLAND.src) stand straight on the night sky, beside the island itself, a
// round 3D diorama of the game's island sitting in a night sea that runs edge to edge to the
// horizon (components/site/island3d/). The
// island is a link too, but it asks "Head to the island?" first (IslandDoor). The stars behind
// this section belong to the shared sky, not to this file. After this comes only the site footer,
// which the page slides up off. Off the clock (the evening reel) left the page on 2026-11-03.
// A server component: the door and the stage are the client pieces inside it.

export default function Island() {
  return (
    <section {...sectionAttrs('island')} className="island" aria-labelledby="island-title">
      <div className="il-wrap">
        <div className="il-text">
          <span className="eyebrow">{ISLAND.eyebrow}</span>
          <h2 id="island-title" className="display il-title">
            <span className="fit-line">{ISLAND.titleTop}</span>
            <span className="fit-line il-kw">{ISLAND.titleBottom}</span>
          </h2>
          <p className="il-tagline">{ISLAND.tagline}</p>
        </div>
        <div className="il-island">
          <IslandDoor label={ISLAND.door}>
            <IslandStage />
          </IslandDoor>
          {/* The landmarks' name buttons (filled by the stage), beside the door, never inside it. */}
          <div className="il-marks" />
        </div>
        <div className="il-go-row">
          <a className="pill pill-light pill-big il-go" href={ISLAND.src}>
            <Play size={18} aria-hidden="true" /> {MICROCOPY.prompt}
          </a>
        </div>
      </div>
    </section>
  );
}
