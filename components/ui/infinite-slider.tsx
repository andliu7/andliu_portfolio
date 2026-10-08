'use client';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { useReducedMotion } from '@/components/site/use-reduced-motion';
import './infinite-slider.css';

// InfiniteSlider, after motion-primitives (Andrew pasted it 2026-10-06 for the stack bands).
// Changes from the original: the second copy is aria-hidden and inert so assistive tech reads the
// content once, a reduced-motion branch renders one still, wrapped copy, and (perf pass,
// 2026-10-07) the loop is a CSS animation instead of a JavaScript one.
//
// How it moves: the children render twice in a row, each copy followed by one `gap` of space.
// A CSS animation (infinite-slider.css) slides the row left by exactly half its own width (one
// copy plus one gap) over `duration` seconds, linearly, then starts again at 0, where the second
// copy has taken the first one's place, so the seam never shows.
// Why CSS and not a JS loop: the browser's compositor runs a transform animation by itself, so
// the page's main thread no longer has to paint a new frame every 16ms for the whole time the
// site is open (it did, even with the band far off screen). app/motion.tsx pauses it while its
// section is off screen.
// durationOnHover: hovering changes the running animation's playback rate (the Web Animations API
// view of the same CSS animation), so the row slows from where it is, with no jump.

type Props = {
  children: ReactNode;
  gap?: number;
  /** Seconds for one pass. */
  duration?: number;
  /** Seconds for one pass while hovered (slower is a larger number). */
  durationOnHover?: number;
  direction?: 'horizontal' | 'vertical';
  reverse?: boolean;
  className?: string;
  /** When set, each copy is a list (children should be role="listitem") named by this label. */
  label?: string;
};

export function InfiniteSlider({ children, gap = 16, duration = 25, durationOnHover, direction = 'horizontal', reverse = false, className = '', label }: Props) {
  const reduced = useReducedMotion();
  const horizontal = direction === 'horizontal';
  const copy: CSSProperties = { display: 'flex', flexDirection: horizontal ? 'row' : 'column', gap };
  const list = label ? { role: 'list', 'aria-label': label } : {};

  if (reduced) {
    return (
      <div className={`islider ${className}`} data-static="">
        <div {...list} style={{ ...copy, flexWrap: 'wrap', justifyContent: 'center' }}>{children}</div>
      </div>
    );
  }

  // Mouse and pen only, like the original's hover (a touch has no hover).
  const rate = (value: number) => (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    event.currentTarget.getAnimations().forEach(animation => animation.updatePlaybackRate(value));
  };
  const hoverProps = durationOnHover
    ? { onPointerEnter: rate(duration / durationOnHover), onPointerLeave: rate(1) }
    : {};
  // Each copy carries its trailing gap as padding, so half the row is exactly one copy plus one gap.
  const trail: CSSProperties = horizontal ? { paddingRight: gap } : { paddingBottom: gap };

  return (
    <div className={`islider ${className}`} style={{ overflow: 'hidden' }}>
      <div
        className="islider-row"
        data-dir={horizontal ? undefined : 'vertical'}
        data-reverse={reverse ? '' : undefined}
        style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', width: 'max-content', '--islider-dur': `${duration}s` } as CSSProperties}
        {...hoverProps}
      >
        <div {...list} style={{ ...copy, ...trail }}>{children}</div>
        <div {...list} style={{ ...copy, ...trail }} aria-hidden="true" inert>{children}</div>
      </div>
    </div>
  );
}

export default InfiniteSlider;
