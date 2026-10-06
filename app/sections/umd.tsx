import { UMD, sectionAttrs } from '@/lib/site';
import { PillFaces } from '@/components/site/pill-faces';
import { Terrapin } from '@/components/site/umd/terrapin';
import { LavaCard } from '@/components/site/umd/lava-card';
import './umd.css';

// College Park (the approved Umd design, fp/project/Umd.dc.html), right after the hero. UMD red
// with gold and black: the chip, COLLEGE / PARK, MD. with the second line on gold, the degree
// line, three tags, the coursework on a Lava AnimatedGradient card, and an original cartoon
// terrapin deadlifting (no Testudo, no block M).
//
// The pin is plain CSS (umd.css): the section is one viewport plus a runway, and its stage is
// position: sticky, so the stage holds the frame while the runway scrolls by, with a gold
// "Contents below" pill pointing on; then it releases into #contents. Reduced motion drops the
// runway and the arrow's bounce. A server component: only the gradient card is client code.

export default function Umd() {
  return (
    <section {...sectionAttrs('umd')} className="umd" aria-labelledby="umd-title">
      <div className="umd-stage">
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
          <LavaCard className="umd-card">
            <span className="umd-card-label">{UMD.courseworkLabel}</span>
            <p className="umd-card-text">{UMD.coursework}</p>
          </LavaCard>
          <div className="umd-art"><Terrapin label={UMD.art} /></div>
        </div>
        <div className="umd-cue">
          <a className="pill umd-down" href="#contents"><PillFaces>{UMD.down}</PillFaces></a>
          <svg className="umd-arrow" width="36" height="44" viewBox="0 0 36 44" aria-hidden="true">
            <path d="M18 2 V38 M4 26 L18 40 L32 26" fill="none" stroke="#000000" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </section>
  );
}
