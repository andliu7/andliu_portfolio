import type { ReactNode } from 'react';

// Highlight (SITE-PLAN.md 2.2, A2), adapted in place from the saved hover-link-animation
// component. The saved version animated a bar with motion/react springs; this port does the same
// thing in CSS, so the landing never downloads motion for a hover:
//   - a bar 0.12em thick sits just under the word (the saved barThickness of .12)
//   - on :hover or :focus-visible it rises to the full height of the word, with the site's spring
//     curve (--ease-spring, 260ms; the saved spring was stiffness 260, damping 24)
//   - the text colour flips to --hl-on, so the word reads on the bar
// Colours come from the ground: --hl-bar is the ground's keyword colour and --hl-on the ground
// itself (app/globals.css, [data-ground]); every pair is WCAG AA (plan 2.2).
// Reduced motion: the bar and colour change instantly.
//
// A server component: pure markup, no state, no effects. Import it as
// `import { Highlight } from '@/components/site/highlight'`.

type Props = {
  children: ReactNode;
  /** The element to render when there is no href. A link is always an <a>. */
  as?: 'span' | 'strong' | 'em';
  href?: string;
  /** Opens in a new tab with rel="noreferrer". */
  external?: boolean;
  className?: string;
};

export function Highlight({ children, as: Tag = 'span', href, external = false, className = '' }: Props) {
  const Element = href ? 'a' : Tag;
  const linkProps = href ? { href, ...(external ? { target: '_blank', rel: 'noreferrer' } : null) } : null;
  return (
    <Element className={`hl ${className}`} {...linkProps}>
      <span className="hl-bar" aria-hidden="true" />
      <span className="hl-text">{children}</span>
    </Element>
  );
}

export default Highlight;
