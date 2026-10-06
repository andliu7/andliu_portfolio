'use client';
import { useMemo, type ReactNode } from 'react';
import AnimatedGradient from '@/components/ui/animated-gradient';
import { NearViewport } from '@/components/site/near-viewport';
import { useReducedMotion } from '@/components/site/use-reduced-motion';
import { cn } from '@/lib/utils';

// A card with Andrew's AnimatedGradient (components/ui/animated-gradient.tsx, Lava preset)
// behind its content. The gradient is a background layer (absolute, z-index -1) and takes no
// children, so the card is the positioned, isolated box and the content is a sibling above it.
//
// Text stays AA over the lava: a 50% black scrim sits between the gradient and the text. Lava's
// brightest colour is #FF9F21; under the scrim, white text on it measures 6.8:1 (umd.css).
// Without WebGL the card keeps its dark red background, which is also AA under white text.
//
// NearViewport mounts the WebGL canvas only near the screen and unmounts it far away, so its
// animation frame loop and GL context are freed once you have scrolled on. Reduced motion
// passes speed 0: the shader draws one still frame of the same pattern.

export function LavaCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  // useMemo keeps the same config object between renders, so the gradient's WebGL effect (which
  // depends on it) is only rebuilt when the Motion setting actually changes.
  const config = useMemo(() => ({ preset: 'Lava' as const, speed: reduced ? 0 : undefined }), [reduced]);

  return (
    <div className={cn('umd-lava', className)}>
      <NearViewport placeholder={null} margin="50%" unmountMargin="150%" className="umd-lava-bg">
        <AnimatedGradient config={config} />
      </NearViewport>
      <div className="umd-lava-scrim" aria-hidden="true" />
      <div className="umd-lava-body">{children}</div>
    </div>
  );
}

export default LavaCard;
