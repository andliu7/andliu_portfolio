'use client';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// InfiniteSlider, after motion-primitives (Andrew pasted it 2026-10-06 for the stack bands).
// Changes from the original: imports from motion/react (framer-motion's current name, already
// installed), a small ResizeObserver hook instead of react-use-measure (no new dependency), the
// second copy aria-hidden and inert so assistive tech reads the content once, and a reduced-motion
// branch that renders one still, wrapped copy.
//
// How it moves: the children render twice in a row. A motion value slides the row left by
// exactly one copy plus one gap, linearly over `duration` seconds, then jumps back to 0, where
// the second copy has taken the first one's place, so the seam never shows.
// durationOnHover: on hover start and end it finishes the current pass at the new speed (a
// one-off animate), then `key` is bumped to restart the endless loop at that speed.

/** The element's border-box size, kept current by a ResizeObserver. Takes the element itself
 *  (from a callback ref, below) so it re-observes when the row first mounts, for example after
 *  the reduced-motion switch is turned off. */
function useSize(el: HTMLElement | null) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0];
      setSize(box ? { width: box.inlineSize, height: box.blockSize } : { width: el.offsetWidth, height: el.offsetHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return size;
}

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
  const [current, setCurrent] = useState(duration);
  // A callback ref: React calls setRow with the element when it mounts (null when it unmounts),
  // and keeping it in state re-runs useSize's effect for the new element.
  const [row, setRow] = useState<HTMLDivElement | null>(null);
  const { width, height } = useSize(row);
  const translation = useMotionValue(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [key, setKey] = useState(0);
  const horizontal = direction === 'horizontal';

  useEffect(() => {
    const size = horizontal ? width : height;
    if (reduced || !size) return;
    const contentSize = size + gap;
    const from = reverse ? -contentSize / 2 : 0;
    const to = reverse ? 0 : -contentSize / 2;
    const controls = isTransitioning
      ? animate(translation, [translation.get(), to], {
          ease: 'linear',
          duration: current * Math.abs((translation.get() - to) / contentSize),
          onComplete: () => { setIsTransitioning(false); setKey(k => k + 1); },
        })
      : animate(translation, [from, to], {
          ease: 'linear', duration: current, repeat: Infinity, repeatType: 'loop', repeatDelay: 0,
          onRepeat: () => translation.set(from),
        });
    return () => controls.stop();
  }, [key, translation, current, width, height, gap, isTransitioning, horizontal, reverse, reduced]);

  const hoverProps = durationOnHover
    ? {
        onHoverStart: () => { setIsTransitioning(true); setCurrent(durationOnHover); },
        onHoverEnd: () => { setIsTransitioning(true); setCurrent(duration); },
      }
    : {};

  const copy: CSSProperties = { display: 'flex', flexDirection: horizontal ? 'row' : 'column', gap };
  const list = label ? { role: 'list', 'aria-label': label } : {};

  if (reduced) {
    return (
      <div className={`islider ${className}`} data-static="">
        <div {...list} style={{ ...copy, flexWrap: 'wrap', justifyContent: 'center' }}>{children}</div>
      </div>
    );
  }

  return (
    <div className={`islider ${className}`} style={{ overflow: 'hidden' }}>
      <motion.div
        ref={setRow}
        style={{ ...copy, width: 'max-content', ...(horizontal ? { x: translation } : { y: translation }) }}
        {...hoverProps}
      >
        <div {...list} style={copy}>{children}</div>
        <div {...list} style={copy} aria-hidden="true" inert>{children}</div>
      </motion.div>
    </div>
  );
}

export default InfiniteSlider;
