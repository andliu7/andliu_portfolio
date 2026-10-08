'use client';
import { useState } from 'react';
import { Envelope, Plane } from '@/components/site/corner-stickers/corner-stickers';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// The envelope and the paper plane on the contact card (Andrew 2026-10-07): they dance once on
// hover, and a click plays a short scene. The envelope gets a stamp thunked on, is shipped off
// the side of the page and a fresh one drops back in; the plane flies off along a curve and comes
// back in from the other side. Every frame is a CSS keyframe in contact.css; React only sets
// data-play on click and clears it when the scene's last animation ends (onAnimationEnd), so a
// scene can be replayed. Neither had an action before, so these are toys: aria-hidden, out of the
// tab order, and the card's own links do the work. Reduced motion: no scenes, no dance.

export function ContactToys() {
  const reduced = useReducedMotion();
  const [envelope, setEnvelope] = useState(false);
  const [plane, setPlane] = useState(false);

  return (
    <div className="ct-toys" aria-hidden="true">
      <button
        type="button" tabIndex={-1} className="ct-toy ct-envelope"
        data-play={envelope ? '' : undefined}
        onClick={() => { if (!reduced) setEnvelope(true); }}
        onAnimationEnd={e => { if (e.animationName === 'ct-ship') setEnvelope(false); }}
      >
        <span className="ct-toy-art"><Envelope /><span className="ct-stamp" /></span>
      </button>
      <button
        type="button" tabIndex={-1} className="ct-toy ct-plane"
        data-play={plane ? '' : undefined}
        onClick={() => { if (!reduced) setPlane(true); }}
        onAnimationEnd={e => { if (e.animationName === 'ct-fly') setPlane(false); }}
      >
        <span className="ct-toy-art"><Plane /></span>
      </button>
    </div>
  );
}

export default ContactToys;
