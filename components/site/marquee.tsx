import { Children, type CSSProperties, type HTMLAttributes } from 'react';

// Ported from Blueberry: grignard-app-source/src/components/ui/marquee.tsx plus its CSS
// (index.css 1584 to 1610), now the .mq-* rules in app/globals.css.
//
// The children render twice back to back and each copy translates a full 100% of itself, so
// at the end of a pass the second copy sits where the first began and the seam never shows.
// The keyframes live in globals.css, not an injected <style>, so two marquees with different
// speeds never retime each other; speed and direction arrive as --mq-duration and
// [data-direction]. Pause on hover is CSS (no React state, no re-render per hover).
//
// The whole strip is decoration: the caller passes `label`, the list as plain text, which is
// what assistive tech reads. Under reduced motion the duplicate hides and the strip becomes an
// ordinary scroller.

type Direction = 'left' | 'right';

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Seconds for one full pass. Lower is faster. */
  duration?: number;
  pauseOnHover?: boolean;
  direction?: Direction;
  /** Fades both ends so items enter and leave instead of popping. */
  fade?: boolean;
  /** The strip's content as one sentence, for screen readers. */
  label: string;
};

export function Marquee({ children, className = '', duration = 30, pauseOnHover = true, direction = 'left', fade = true, label, style, ...props }: Props) {
  const items = Children.toArray(children);
  return (
    <div className={`mq-wrap ${className}`} {...props}>
      <p className="sr-only">{label}</p>
      <div
        className={fade ? 'mq mq-fade' : 'mq'}
        aria-hidden="true"
        data-direction={direction}
        data-pause-on-hover={pauseOnHover ? '' : undefined}
        style={{ ...style, '--mq-duration': `${duration}s` } as CSSProperties}
      >
        {[false, true].map(isClone => (
          <div key={isClone ? 'clone' : 'original'} className="mq-track" data-clone={isClone ? '' : undefined}>
            {items.map((item, i) => <div className="mq-item" key={i}>{item}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Marquee;
