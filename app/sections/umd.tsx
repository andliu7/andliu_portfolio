import { UMD, sectionAttrs } from '@/lib/site';
import { PillFaces } from '@/components/site/pill-faces';
import { TiltFrame } from '@/components/site/tilt-frame';
import { SweatyTerrapin } from '@/components/site/umd/sweaty-terrapin';
import { LavaCard } from '@/components/site/umd/lava-card';
import { MarylandFlag } from '@/components/site/umd/flag';
import { MarylandIcon } from '@/components/site/umd/maryland-icon';
import './umd.css';

// College Park (the approved Umd design, fp/project/Umd.dc.html), right after the hero. Behind
// it the Maryland flag waves in the wind (flag.tsx), under a static shadow that is darkest on the
// left so the white headline and degree line read over it. On top: a cartoon Maryland that tilts
// toward the pointer, the chip, COLLEGE / PARK, MD. with
// the second line on gold, the degree line, three tags, the coursework on a Lava AnimatedGradient
// card that tilts and magnifies on hover, and an original cartoon terrapin deadlifting (no
// Testudo; its shirt carries an original slab M) who sweats when pressed (sweaty-terrapin.tsx).
//
// One screen tall and not pinned (Andrew 2026-10-07: "don't make the umd page stick"); a gold
// "Contents below" pill with a bobbing arrow sits at its foot. Reduced motion stills the arrow.
// A server component: the flag, the tilts, the terrapin button and the gradient card are the
// client islands inside it.

export default function Umd() {
  return (
    <section {...sectionAttrs('umd')} className="umd" aria-labelledby="umd-title">
      <div className="umd-stage">
        {/* The flag starts its WebGL after the loader lifts and only near the viewport (flag.tsx) */}
        <MarylandFlag className="umd-flag" />
        <div className="umd-shade" aria-hidden="true" />
        <div className="umd-grid">
          <span className="umd-chip">{UMD.chip}</span>
          <h2 id="umd-title" className="display umd-title">
            <span className="fit-line">{UMD.titleTop}</span>{' '}
            <span className="fit-line"><span className="umd-gold">{UMD.titleBottom}</span></span>
          </h2>
          <p className="umd-degree">{UMD.degree}</p>
          <ul className="umd-tags">
            {UMD.tags.map(tag => <li key={tag}>{tag}</li>)}
          </ul>
          {/* TiltFrame with one flat layer: the card tilts toward the pointer (fine pointer only). */}
          <TiltFrame className="umd-card" max={7} shift={0} layers={[{ depth: 0, node: (
            <LavaCard>
              <span className="umd-card-label">{UMD.courseworkLabel}</span>
              <p className="umd-card-text">{UMD.coursework}</p>
            </LavaCard>
          ) }]} />
          <div className="umd-art"><SweatyTerrapin label={UMD.sweat} /></div>
        </div>
        <div className="umd-state" aria-hidden="true">
          <TiltFrame max={14} shift={0} layers={[{ depth: 0, node: <MarylandIcon className="umd-state-svg" /> }]} />
        </div>
        <div className="umd-cue">
          <a className="pill umd-down" href="#contents"><PillFaces>{UMD.down}</PillFaces></a>
          <svg className="umd-arrow" width="36" height="44" viewBox="0 0 36 44" aria-hidden="true">
            <path d="M18 2 V38 M4 26 L18 40 L32 26" fill="none" stroke="#FFD200" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 2 V38 M4 26 L18 40 L32 26" fill="none" stroke="#000000" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </section>
  );
}
