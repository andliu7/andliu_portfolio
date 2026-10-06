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
// html[data-hscroll="on"]: set while any pinned strip holds the screen (the header styles itself
// from it). Each strip adds itself to one shared Set and the attribute follows the Set's size, so
// two strips handing over in the same frame can never clear each other's flag.
//
// Pattern: a custom hook. It returns refs for the caller to attach (ref={runwayRef}); a ref is a
// box React fills with the real DOM element after render, which the effect then reads.

const WIDE = '(min-width: 700px)';

const activeStrips = new Set<HTMLElement>();
function markActive(runway: HTMLElement, active: boolean) {
  if (active) activeStrips.add(runway); else activeStrips.delete(runway);
  if (activeStrips.size) document.documentElement.dataset.hscroll = 'on';
  else delete document.documentElement.dataset.hscroll;
}

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
      const box = runway.getBoundingClientRect();
      const p = run ? Math.min(1, Math.max(0, -box.top / run)) : 0;
      // Pinned means the frame is stuck to the screen: the runway's top is above it, its foot below.
      markActive(runway, box.top <= 0.5 && box.bottom >= window.innerHeight - 0.5);
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
      markActive(runway, false);
      runway.removeAttribute('data-pin');
      runway.style.removeProperty('--run');
      runway.style.removeProperty('--p');
      track.style.transform = '';
      items.forEach(item => item.classList.remove('hs-in'));
    };
  }, [pinned]);

  // Where item `index` sits centred, as strip progress 0..1 (Off the clock's slider steps by these).
  const progressOf = useCallback((index: number) => {
    const track = trackRef.current;
    const item = track?.querySelectorAll<HTMLElement>('[data-hs-item]')[index];
    const frame = track?.parentElement;
    if (!track || !item || !frame) return 0;
    const run = track.scrollWidth - frame.clientWidth;
    return run > 0 ? Math.min(1, Math.max(0, (item.offsetLeft - (frame.clientWidth - item.offsetWidth) / 2) / run)) : 0;
  }, []);

  // Scroll the page to strip progress p (0..1). `immediate` skips the smooth glide, for a drag
  // that must follow the pointer exactly; otherwise it glides for `duration` seconds.
  const scrollToProgress = useCallback((p: number, immediate = false, duration = 1.6) => {
    const runway = runwayRef.current;
    const track = trackRef.current;
    const frame = track?.parentElement;
    if (!runway || !track || !frame) return;
    const run = Math.max(0, track.scrollWidth - frame.clientWidth);
    const y = runway.getBoundingClientRect().top + window.scrollY + Math.min(1, Math.max(0, p)) * run;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, immediate ? { immediate: true } : { duration });
    else window.scrollTo({ top: y });
  }, []);

  // Scroll to just past the section: the way out of a pinned strip.
  const scrollPast = useCallback(() => {
    const runway = runwayRef.current;
    if (runway) scrollToY(runway.getBoundingClientRect().bottom + window.scrollY);
  }, []);

  return { runwayRef, trackRef, pinned, progressOf, scrollToProgress, scrollPast };
}
