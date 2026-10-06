'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getLenis, scrollToY } from '@/app/smooth';
import { useReducedMotion } from './use-reduced-motion';

// Vertical scroll drives a horizontal strip (Experience's timeline, Off the clock's evening).
//
// The sticky-runway pattern, in three elements:
//   runway  the <section>. Made taller than the screen by exactly how far the strip must travel
//           (height: 100svh + --run). That extra height is the "runway" the visitor scrolls down.
//   frame   its first child, position:sticky; top:0; height:100svh. While the runway scrolls
//           past, the frame stays glued to the screen (the section "pins").
//   track   the wide strip inside the frame. Each frame we read how far the runway has scrolled
//           (0 at its top, --run at its end) and slide the track left by the same amount.
// So one pixel down is one pixel left, and once the runway ends the page scrolls on normally.
// Only `transform` changes per frame (no layout), batched in requestAnimationFrame.
//
// Keyboard and screen readers: the cards stay in normal DOM order, so Tab and a reader walk them
// in sequence. When focus lands inside the track, we scroll the page to the point where that card
// sits in view. The frame uses overflow:clip, not hidden, so the browser never scrolls the frame
// sideways on its own (a clip box is not a scroll container).
//
// Fallback: under reduced motion, or under 700px wide, nothing pins. data-pin stays off, the CSS
// lays the cards out as a plain vertical stack, and the page scrolls like any other section.
//
// Items: children of the track marked data-hs-item get the class hs-in as they come on screen
// (from the right while pinned, from below in the stack), which the section CSS uses to pop them.
// The track must be position:relative so each item's offsetLeft is measured from the track.
//
// Pattern: a custom hook. It returns refs for the caller to attach (ref={runwayRef}); a ref is a
// box React fills with the real DOM element after render, which the effect then reads.

const WIDE = '(min-width: 700px)';

export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>(onProgress?: (p: number) => void) {
  const runwayRef = useRef<HTMLElement>(null);
  const trackRef = useRef<T>(null);
  const reduced = useReducedMotion();
  const [wide, setWide] = useState(false);
  const pinned = wide && !reduced;

  // Keep the latest callback without restarting the scroll effect on every render.
  const progressRef = useRef(onProgress);
  useEffect(() => { progressRef.current = onProgress; });

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const runway = runwayRef.current;
    const track = trackRef.current;
    const frame = track?.parentElement;
    if (!runway || !track || !frame) return;
    const items = [...track.querySelectorAll<HTMLElement>('[data-hs-item]')];

    if (!pinned) {
      // The stack: reveal each item once as it scrolls up into view.
      const io = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('hs-in'); io.unobserve(entry.target); }
      }, { rootMargin: '0px 0px -15% 0px' });
      items.forEach(item => io.observe(item));
      return () => io.disconnect();
    }

    let run = 0;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = run ? Math.min(1, Math.max(0, -runway.getBoundingClientRect().top / run)) : 0;
      const x = p * run;
      track.style.transform = `translate3d(${-x}px,0,0)`;
      runway.style.setProperty('--p', p.toFixed(4));
      const w = frame.clientWidth;
      // In once its left edge passes 85% of the frame; out again if it slides back off the right.
      for (const item of items) item.classList.toggle('hs-in', item.offsetLeft - x < w * 0.85);
      progressRef.current?.(p);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const measure = () => {
      run = Math.max(0, track.scrollWidth - frame.clientWidth);
      runway.style.setProperty('--run', `${run}px`);
      schedule();
    };

    const onFocus = (event: FocusEvent) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>('[data-hs-item]');
      if (!item || !run) return;
      const want = item.offsetLeft - (frame.clientWidth - item.offsetWidth) / 2;
      const p = Math.min(1, Math.max(0, want / run));
      const y = runway.getBoundingClientRect().top + window.scrollY + p * run;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo({ top: y });
    };

    runway.setAttribute('data-pin', '');
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    ro.observe(frame);
    window.addEventListener('scroll', schedule, { passive: true });
    track.addEventListener('focusin', onFocus);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', schedule);
      track.removeEventListener('focusin', onFocus);
      runway.removeAttribute('data-pin');
      runway.style.removeProperty('--run');
      runway.style.removeProperty('--p');
      track.style.transform = '';
      items.forEach(item => item.classList.remove('hs-in'));
    };
  }, [pinned]);

  // Scroll the page so item `index` is in view: centred in the pinned strip, or at the top of
  // the stack. For buttons that jump along the strip (Off the clock's switch).
  const scrollToItem = useCallback((index: number) => {
    const runway = runwayRef.current;
    const track = trackRef.current;
    const item = track?.querySelectorAll<HTMLElement>('[data-hs-item]')[index];
    if (!runway || !track || !item) return;
    const top = runway.getBoundingClientRect().top + window.scrollY;
    if (!pinned) { scrollToY(item.getBoundingClientRect().top + window.scrollY - 80); return; }
    const frame = track.parentElement!;
    const run = Math.max(0, track.scrollWidth - frame.clientWidth);
    const want = item.offsetLeft - (frame.clientWidth - item.offsetWidth) / 2;
    scrollToY(top + Math.min(run, Math.max(0, want)));
  }, [pinned]);

  return { runwayRef, trackRef, pinned, scrollToItem };
}
