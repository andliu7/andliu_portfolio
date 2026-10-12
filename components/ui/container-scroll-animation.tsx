'use client';
import React, { useRef } from 'react';
import { useScroll, useTransform, motion, MotionValue } from 'motion/react';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// Aceternity's ContainerScroll, as Andrew pasted it (scratchpad container-scroll-spec.md), for
// the Contents section: as the section scrolls up, the card tilts from rotateX 20deg to flat and
// scales into place while the title rises. Changes from the paste, and why:
//   - imports `motion/react` (framer-motion's new name, already installed) instead of framer-motion
//   - the scroll range ends when the section's top reaches the top of the screen ("start start"),
//     not when it has left the screen, so the card is fully flat while you read and click it
//   - heights are the content's own (no fixed 60rem/80rem box, no 40rem card), so no dead space
//   - the demo greys are the site's tokens: an ink frame with a berry rim, a berry-deep inner
//   - reduced motion: flat and still (no tilt, no scale, no rise)
//   - a much stronger entrance (Andrew 2026-10-12: "make the where to? come in at a stronger
//     angle - it's not very obvious it's moving"). At 20deg the card was already down to about
//     15deg by the time its top edge reached the screen, so the visible part of the move was
//     small. Now it starts 48deg back with a 4deg twist and 120px low, holds that until progress
//     0.25 (about when the card's top first shows on desktop and phone), then goes flat by
//     progress 1 (linear, so it tracks the scroll). The pivot is the card's bottom edge, so the visible top swings back hardest.
//     Transform only: rotate, scale and translate, no layout per frame
//
// Pattern: useScroll gives scroll progress 0..1 as a MotionValue, and useTransform maps it to
// a rotation, a scale and a shift. MotionValues update the element's style directly on every
// scroll frame, without re-rendering React.

export const ContainerScroll = ({
  titleComponent,
  children,
  className = '',
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'start start'] });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    if (reduced) return [1, 1];
    return isMobile ? [0.9, 1] : [1.05, 1];
  };

  const rotate = useTransform(scrollYProgress, [0.25, 1], reduced ? [0, 0] : [48, 0]);
  const twist = useTransform(scrollYProgress, [0.25, 1], reduced ? [0, 0] : [-4, 0]);
  const lift = useTransform(scrollYProgress, [0.25, 1], reduced ? [0, 0] : [120, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [60, 0]);

  return (
    <div className={`relative flex items-center justify-center ${className}`} ref={containerRef}>
      <div className="w-full relative" style={{ perspective: '1000px' }}>
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} twist={twist} lift={lift} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }: { translate: MotionValue<number>; titleComponent: React.ReactNode }) => {
  return (
    <motion.div style={{ translateY: translate }} className="max-w-5xl mx-auto text-center">
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  twist,
  lift,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  twist: MotionValue<number>;
  lift: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        rotateZ: twist,
        translateY: lift,
        scale,
        transformOrigin: '50% 100%',
        boxShadow:
          '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
      }}
      className="max-w-5xl mt-6 mx-auto w-full border-4 border-[var(--berry)] p-2 md:p-4 bg-[var(--ink)] rounded-[30px]"
    >
      <div className="w-full overflow-hidden rounded-2xl bg-[var(--berry-deep)] md:p-2">
        {children}
      </div>
    </motion.div>
  );
};

export default ContainerScroll;
