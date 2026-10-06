import type { CSSProperties } from 'react';
import { Shot } from './shot';
import { CheckSticker } from './art';

// The exploded phone (SITE-PLAN.md 4.4, A4), the readable version: five flat planes of
// Blueberry stacked in CSS 3D and pulled apart along Z, so you can see what the app is made of.
// Pure CSS (no three.js, no canvas). Front to back, the PHONE_LAYERS ids:
//   glass   a clear plane holding the flashcard you touch
//   deck    two more cards behind it
//   lesson  the real lesson screen (the capture)
//   rdkit   a structure over a bond-electron grid, and the check the grader gives
//   frame   the phone body, camera pill and tab bar
// The list of layer names and what each does sits beside it in the section, as text; this
// drawing is decoration, so it is aria-hidden. Each plane's distance is --z (a multiple of the
// phone width), and the planes close up until the director marks the stage .is-in (blueberry.css).
// A server component.

export function ExplodedPhone() {
  return (
    <div className="bb-phone" data-reveal aria-hidden="true">
      <div className="bb-phone-stack">
        <div className="bb-plane bb-plane-frame" style={{ '--z': -2 } as CSSProperties}>
          <span className="bb-phone-cam" />
          <span className="bb-phone-tabs"><i /><i /><i /></span>
        </div>
        <div className="bb-plane bb-plane-rdkit" style={{ '--z': -1 } as CSSProperties}>
          <span className="bb-grid" />
          <svg className="bb-rdkit-mol" viewBox="0 0 120 110">
            <polygon points="50,20 76,35 76,65 50,80 24,65 24,35" />
            <path d="M50 27.5 69.5 38.8M69.5 61.3 50 72.5M30.5 61.3V38.8M76 35 100 21M100 21V2M106 21V4" />
          </svg>
          <CheckSticker className="bb-rdkit-check" />
        </div>
        <div className="bb-plane bb-plane-lesson" style={{ '--z': 0 } as CSSProperties}>
          <Shot image="bbLesson" sizes="240px" className="bb-lesson-shot" />
        </div>
        <div className="bb-plane bb-plane-deck" style={{ '--z': 1 } as CSSProperties}>
          <span className="bb-deck-card" /><span className="bb-deck-card" />
        </div>
        <div className="bb-plane bb-plane-glass" style={{ '--z': 2 } as CSSProperties}>
          <span className="bb-glass-card"><b /><i /><i /></span>
        </div>
      </div>
    </div>
  );
}

export default ExplodedPhone;
