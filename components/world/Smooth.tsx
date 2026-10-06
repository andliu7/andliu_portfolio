'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';

// Smooth scrolling for the Lando pacing. Lenis eases the real document scroll, so
// window.scrollY and every anchor link keep working; the camera reads scrollY as usual.
// Skipped entirely under reduced motion.

export default function Smooth() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // anchors: Lenis handles #work style links itself, otherwise the browser's own smooth
    // scroll and Lenis fight and the page stops short of the target.
    const lenis = new Lenis({ autoRaf: true, lerp: 0.09, anchors: true });
    return () => lenis.destroy();
  }, []);
  return null;
}
