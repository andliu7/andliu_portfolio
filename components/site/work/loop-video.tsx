'use client';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../use-reduced-motion';

// A silent looping video standing in for a screenshot (IMAGES entries with `video`). The poster is
// the screenshot itself, so the frame shows before the video arrives and with motion reduced.
// It plays only while on screen (an IntersectionObserver), so a loop nobody can see costs nothing.
// useRef holds the <video> element so the effect can call play() and pause() on it.

export function LoopVideo({ src, poster, label, className = '' }: { src: string; poster: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (reduced) { video.pause(); video.currentTime = 0; return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {}); // autoplay can be refused; the poster stays
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <video ref={ref} className={`shot ${className}`} src={src} poster={poster} muted loop playsInline preload="none" aria-label={label} />
  );
}
