'use client';
import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// The Contents to Blueberry hand-off (Andrew 2026-10-06: "make the 01 page come up like this",
// the pasted FlowArt / story-scroll component, scratchpad story-scroll-spec.md). Only its two
// mechanics, applied to this one seam:
//   1. Contents holds still (pinned from 'bottom bottom' to 'bottom top', pinSpacing false), so
//      the chapter slides up over it.
//   2. The chapter's inner layer (.bb-flow, which carries its ground) swings up from 30deg to
//      flat, pivoting on its left edge one screen down, scrubbed from 'top bottom' to 'top 25%'.
//      FlowArt pivots on the layer's bottom left corner; its demo pages are one screen tall, but
//      this chapter is several, so a corner thousands of px down would fling the visible top far
//      off screen. Pivoting one screen down gives the same swing for what is on screen.
// Lenis already drives ScrollTrigger (app/motion.tsx, syncLenis), so the scrub stays in step.
// Reduced motion: nothing is created; the chapter simply follows Contents.
//
// Pattern: gsap.context() inside useEffect, with ctx.revert() as the cleanup. That is what
// @gsap/react's useGSAP wraps (not installed, so not added): every tween and ScrollTrigger made
// inside the context is killed and its inline styles removed when the effect re-runs or unmounts.

export function BlueberrySwing() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const contents = document.getElementById('contents');
    const chapter = document.getElementById('blueberry');
    const layer = chapter?.querySelector<HTMLElement>('.bb-flow');
    if (!contents || !chapter || !layer) return;
    gsap.registerPlugin(ScrollTrigger);

    // Other triggers inside the chapter (reveals, count-ups) are measured at refresh. Measuring
    // them while the layer is tilted would put their start points in the wrong place, so the
    // layer is set flat for the measurement; the scrub puts the tilt back right after.
    const flatten = () => gsap.set(layer, { rotation: 0 });
    ScrollTrigger.addEventListener('refreshInit', flatten);

    const ctx = gsap.context(() => {
      gsap.set(contents, { zIndex: 1 });
      gsap.set(chapter, { zIndex: 2 });
      ScrollTrigger.create({ trigger: contents, start: 'bottom bottom', end: 'bottom top', pin: true, pinSpacing: false });
      gsap.fromTo(layer,
        { rotation: 30, transformOrigin: () => `0px ${window.innerHeight}px` },
        // immediateRender false: the tilt is first applied when the swing starts, not on load.
        // The chapter's line reveals (app/motion.tsx, SplitText) split their lines on load, and a
        // tilted paragraph would split into one word per line.
        { rotation: 0, ease: 'none', immediateRender: false, scrollTrigger: { trigger: chapter, start: 'top bottom', end: 'top 25%', scrub: true, invalidateOnRefresh: true } });
    });
    ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.removeEventListener('refreshInit', flatten);
      ctx.revert();
      gsap.set(layer, { clearProps: 'transform,transformOrigin' }); // flatten() ran outside the context
      ScrollTrigger.refresh();
    };
  }, [reduced]);

  return null;
}

export default BlueberrySwing;
