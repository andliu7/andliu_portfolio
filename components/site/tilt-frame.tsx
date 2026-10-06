'use client';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useFinePointer } from './use-fine-pointer';
import { useReducedMotion } from './use-reduced-motion';

// TiltFrame (SITE-PLAN.md 2.2, A6): layers that part in depth toward the pointer, the "slightly
// different view" effect on project images and portraits.
//
// `layers` is ordered back to front, each with a depth from 0 (back) to 1 (front). While a fine
// pointer moves inside the frame, the frame tilts up to `max` degrees and each layer slides up to
// `depth * shift` px opposite the pointer, so the front moves more than the back. On leave it
// eases back over 600ms. Touch screens and reduced motion get a flat frame: nothing moves and a
// tap does nothing special.
//
// Pattern: refs plus CSS variables instead of state. The pointer handler writes --px and --py
// (the pointer as -1 to 1) on the frame element once per animation frame; CSS turns them into
// rotateX/rotateY and each layer's translate. React never re-renders while the pointer moves.
// The CSS is the .tilt rules in app/globals.css.

export type TiltLayer = { node: ReactNode; depth: number };

export function TiltFrame({ layers, max = 6, shift = 14, className = '', style }: {
  layers: readonly TiltLayer[];
  max?: number;
  shift?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const live = fine && !reduced;

  useEffect(() => {
    const el = ref.current;
    if (!el || !live) return;
    let frame = 0;
    let px = 0;
    let py = 0;

    const write = () => {
      frame = 0;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      const box = el.getBoundingClientRect();
      px = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1));
      py = Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height) * 2 - 1));
      el.setAttribute('data-tilting', '');
      if (!frame) frame = requestAnimationFrame(write);
    };
    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      el.removeAttribute('data-tilting'); // the CSS transition eases back to rest
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    // The cleanup runs when the pointer type or motion setting changes, or on unmount.
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      onLeave();
    };
  }, [live]);

  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      data-flat={live ? undefined : ''}
      style={{ ...style, '--tilt-max': `${max}deg`, '--tilt-shift': `${shift}px` } as CSSProperties}
    >
      <div className="tilt-stage">
        {layers.map((layer, i) => (
          <div className="tilt-layer" key={i} style={{ '--depth': layer.depth } as CSSProperties}>{layer.node}</div>
        ))}
      </div>
    </div>
  );
}

export default TiltFrame;
