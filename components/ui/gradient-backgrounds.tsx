import type { CSSProperties } from 'react';
import type { Gradient } from '@/lib/site';

// GradientGround (SITE-PLAN.md A16, 1.2), adapted in place from the saved gradient-backgrounds
// component. The saved shape stays: `radial-gradient(125% 125% at 50% 10%, <light> 40%,
// <accent> 100%)` on an absolutely positioned layer. What changed: the demo indigo is gone, the
// unused useState and cn are dropped, and the colours come only from the Stage tokens through
// the [data-gradient] rules in app/globals.css:
//   paper-apricot  paper into apricot (the hero; ink text stays AA at the darkest point, 12.61)
//   berry-deep     berry into berry-deep (the Blueberry chapter; paper text 6.55 at worst)
//   paper-berry    paper into berry (About, behind the portrait only: no text colour is AA across it)
//
// Section roots do not need this: sectionAttrs() in lib/site.ts puts data-gradient on the section
// itself. Use GradientGround for a layer inside something else (About's portrait backdrop).
// A server component, decorative, aria-hidden.

export function GradientGround({ gradient, className = '', style }: { gradient: Gradient; className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={`gradient-ground ${className}`} data-gradient={gradient} style={style} />;
}

export default GradientGround;
