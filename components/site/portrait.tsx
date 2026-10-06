import type { CSSProperties, ReactNode } from 'react';
import { IDENTITY, PORTRAITS, type PortraitId } from '@/lib/site';
import { TiltFrame } from './tilt-frame';

// Portrait (SITE-PLAN.md 2.2, 2.8, A11): one slot per photo of Andrew, read from PORTRAITS in
// lib/site.ts.
//   With a `src`: up to three TiltFrame layers, back (a ground-coloured shape), the photo, and the
//   optional `cutout` in front (a transparent image of just him), so he separates from the
//   background in depth.
//   Without a `src`: the designed placeholder. A paper-to-apricot radial at the back, an apricot disc in the middle, and his monogram in front: "A" in Antic and "L" in
//   Fira Code 700, the site's two voices. Not a grey box, not a stranger, and it already shows
//   the depth effect.
// `art` replaces the monogram (the off-the-clock notes draw a pan, a plate or a window there).
//
// A server component that hands its layers to TiltFrame, a client component. Passing JSX from a
// server component into a client component as props is allowed: it arrives already rendered.

export function Portrait({ id, sizes = '(min-width: 768px) 38vw, 42vw', art, className = '' }: {
  id: PortraitId;
  sizes?: string;
  art?: ReactNode;
  className?: string;
}) {
  const entry = PORTRAITS[id];
  const style = { '--ratio': `${entry.w} / ${entry.h}` } as CSSProperties;

  if (entry.src) {
    const layers = [
      { node: <div className="portrait-back" />, depth: 0 },
      { node: <img className="portrait-photo" src={entry.src} alt={entry.cutout ? '' : entry.alt} width={entry.w} height={entry.h} sizes={sizes} loading="lazy" decoding="async" />, depth: 0.5 },
      ...(entry.cutout ? [{ node: <img className="portrait-photo" src={entry.cutout} alt={entry.alt} width={entry.w} height={entry.h} sizes={sizes} loading="lazy" decoding="async" />, depth: 1 }] : []),
    ];
    return <figure className={`portrait ${className}`} style={style}><TiltFrame layers={layers} /></figure>;
  }

  const [first, last] = [IDENTITY.first.charAt(0), IDENTITY.last.charAt(0)];
  const layers = [
    { node: <div className="portrait-back" data-gradient="paper-apricot" />, depth: 0 },
    { node: <div className="portrait-disc" />, depth: 0.5 },
    { node: art ?? <div className="portrait-mono"><span className="portrait-mono-a">{first}</span><span className="portrait-mono-l">{last}</span></div>, depth: 1 },
  ];
  return (
    <figure className={`portrait portrait-placeholder ${className}`} style={style} role="img" aria-label={entry.alt}>
      <TiltFrame layers={layers} />
    </figure>
  );
}

export default Portrait;
