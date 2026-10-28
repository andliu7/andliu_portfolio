'use client';
import { useCallback, useEffect, useRef } from 'react';
import { getLenis, scrollToY } from '@/app/smooth';
import { useReducedMotion } from './use-reduced-motion';
import { autoplayOn, subscribeAutoplay } from './strip-autoplay';

// Vertical scroll drives a horizontal strip (Experience's timeline, Off the clock's evening).
//
// The sticky-runway pattern, in three elements:
//   runway  the <section>. Made taller than the screen by exactly how far the strip must travel
//           (height: 100svh + --run). That extra height is the "runway" the visitor scrolls down.
//   frame   its first child, position:sticky; top:0; height:100svh. While the runway scrolls
//           past, the frame stays glued to the screen (the section "pins").
//   track   the wide strip inside the frame. Each frame we read how far the runway has scrolled
//           (0 at its top, --run at its end) and slide the track left by the same amount.
// So one pixel down is one pixel left (or `speed` pixels, see below), and once the runway ends the page scrolls on normally.
//
// Hold (Andrew 2026-10-20: "it should hold at the first card for a moment. I was trying to scroll
// down to see the full card and it scrolled right"): the runway can start with `hold` screens of
// plain scroll during which the strip stays at its start, so the first card can be read before
// anything slides. The runway is then hold + travel / speed tall.
// Only `transform` changes per frame (no layout), batched in requestAnimationFrame.
//
// Keyboard and screen readers: the cards stay in normal DOM order, so Tab and a reader walk them
// in sequence. When focus lands inside the track, we scroll the page to the point where that card
// sits in view. The frame uses overflow:clip, not hidden, so the browser never scrolls the frame
// sideways on its own (a clip box is not a scroll container).
//
// Fallback: under reduced motion nothing pins. data-pin stays off, the CSS lays the cards out as a
// plain vertical stack, and the page scrolls like any other section. Phones pin too (Andrew,
// 2026-10-11: "keep the horizontal scroll on phone screens"); before that, under 700px stacked.
//
// Items: children of the track marked data-hs-item get the class hs-in as they come on screen
// (from the right while pinned, once the section is most of the way up the screen; from below in
// the stack), which the section CSS uses to pop them.
// The track must be position:relative so each item's offsetLeft is measured from the track.
//
// html[data-hscroll="on"]: set while any pinned strip holds the screen (the header styles itself
// from it). Each strip adds itself to one shared Set and the attribute follows the Set's size, so
// two strips handing over in the same frame can never clear each other's flag.
//
// Auto-play (Andrew 2026-10-07: "make it animate through on default"): once a pinned strip holds
// the screen and the page has been still for about 3/4 of a second, the strip glides itself from
// card to card (a calm ease, about 240px a second, then a 1.8s rest on each card) up to its end.
// Any wheel, touch, pointer press or key while it plays hands control back at once, and it stays
// stopped until the strip is left and entered again. The glide checks each frame that the page
// is where it last put it, so a scrollbar drag stops it too. The on/off setting is shared by
// both strips (components/site/strip-autoplay.tsx).
//
// Any key: while a strip holds the screen, a key glides to just past its end (Andrew 2026-10-28:
// "press any key to skip ... a really harsh stop"), unless a dialog, the menu or the chat is
// open, or the key is a modifier or Tab (Tab walks the cards, below), or focus is in a field.
//
// Swipe: on a touch screen a sideways swipe on the strip moves it too, as a down-scroll does
// (Andrew 2026-10-28: "on phones people should be able to scroll down or scroll right"). The
// frame sets touch-action pan-y (experience.css), so the browser keeps the vertical drag and
// hands the sideways one to the swipe, which turns it into page scroll.
//
// Pattern: a custom hook. It returns refs for the caller to attach (ref={runwayRef}); a ref is a
// box React fills with the real DOM element after render, which the effect then reads.

const activeStrips = new Set<HTMLElement>();
function markActive(runway: HTMLElement, active: boolean) {
  if (active) activeStrips.add(runway); else activeStrips.delete(runway);
  if (activeStrips.size) document.documentElement.dataset.hscroll = 'on';
  else delete document.documentElement.dataset.hscroll;
}

// `speed` is how many px the strip slides per px scrolled (1 by default). Above 1 the runway is
// shorter than the strip's travel, so the strip moves faster (Off the clock uses 1.4).
// `hold` is the still stretch at the runway's start, in screen heights (0 by default).
export function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>(onProgress?: (p: number) => void, { speed = 1, hold = 0 }: { speed?: number; hold?: number } = {}) {
  const runwayRef = useRef<HTMLElement>(null);
  const trackRef = useRef<T>(null);
  const reduced = useReducedMotion();
  const pinned = !reduced;

  // Keep the latest callback without restarting the scroll effect on every render.
  const progressRef = useRef(onProgress);
  useEffect(() => { progressRef.current = onProgress; });

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

    let travel = 0; // how far the track slides, px
    let held = 0; // the still stretch at the runway's start, px of scroll: hold screens
    let run = 0; // the runway, px of scroll: held + travel / speed
    let raf = 0;
    // Geometry cached by measure(), so the per-frame update reads nothing but scrollY. Reading
    // layout (getBoundingClientRect, clientWidth, offsetLeft) after another script's style write
    // in the same frame forces a synchronous layout of the whole page, once per read.
    let runwayTop = 0, runwayH = 0, viewH = 0, frameW = 0;
    let lefts: number[] = [];
    const shown = items.map(() => false); // last hs-in state per item, so unchanged ones are not touched
    let lastP = '';
    let near = false; // the runway is within about one screen of the viewport (IntersectionObserver)
    const update = () => {
      raf = 0;
      const top = runwayTop - window.scrollY;
      const p = run > held ? Math.min(1, Math.max(0, (-top - held) / (run - held))) : 0;
      // Pinned means the frame is stuck to the screen: the runway's top is above it, its foot below.
      const holding = top <= 0.5 && top + runwayH >= viewH - 0.5;
      markActive(runway, holding);
      setActive(holding);
      // The section has come most of the way up the screen (its top above 35% of it).
      const arrived = top < viewH * 0.35;
      const fixed = p.toFixed(4) + (arrived ? '' : '-');
      if (fixed === lastP) return; // nothing moved: skip the writes and the callback
      lastP = fixed;
      const x = p * travel;
      track.style.transform = `translate3d(${-x}px,0,0)`;
      runway.style.setProperty('--p', p.toFixed(4));
      // In once the section has arrived and its left edge passes 85% of the frame; out again if it
      // slides back off the right or the section drops back down the screen.
      items.forEach((item, k) => {
        const on = arrived && lefts[k] - x < frameW * 0.85;
        if (on !== shown[k]) { shown[k] = on; item.classList.toggle('hs-in', on); }
      });
      progressRef.current?.(p);
    };
    // Scroll events far from the strip do nothing; the observer below runs one last update as the
    // runway leaves, so it always rests at its true end state.
    const schedule = () => { if (!raf && near) raf = requestAnimationFrame(update); };
    // All layout reads live here, run on mount and whenever a size changes (the ResizeObserver
    // below watches the track, the frame and body, whose height changes when anything above moves).
    const measure = () => {
      frameW = frame.clientWidth;
      travel = Math.max(0, track.scrollWidth - frameW);
      viewH = window.innerHeight;
      held = travel ? hold * viewH : 0;
      run = held + travel / speed;
      runway.style.setProperty('--run', `${run}px`);
      const box = runway.getBoundingClientRect();
      runwayTop = box.top + window.scrollY; runwayH = box.height;
      lefts = items.map(item => item.offsetLeft);
      lastP = ''; // geometry changed: the next update must write even if p did not
      schedule();
    };
    const nearIO = new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      if (!raf) raf = requestAnimationFrame(update);
    }, { rootMargin: '100% 0px' });

    const onFocus = (event: FocusEvent) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>('[data-hs-item]');
      if (!item || !run) return;
      const want = item.offsetLeft - (frame.clientWidth - item.offsetWidth) / 2;
      const p = Math.min(1, Math.max(0, want / travel));
      const y = runway.getBoundingClientRect().top + window.scrollY + held + p * (run - held);
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo({ top: y });
    };

    // ---- Auto-play and Esc (see the top of the file) ----
    let active = false;
    let phase: 'idle' | 'settle' | 'glide' | 'rest' = 'idle';
    let glide = 0; // the glide's requestAnimationFrame id
    let timer = 0; // the settle check or the rest on a card
    let stopped = false; // the visitor took over on this pass through the strip
    const halt = () => { cancelAnimationFrame(glide); clearTimeout(timer); glide = 0; timer = 0; phase = 'idle'; };
    const setY = (y: number) => {
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    };
    // The next card to rest on: each item centred in the frame (as onFocus does), then the end.
    const nextStop = (from: number) => {
      const w = frame.clientWidth;
      const stops = items.map(item => held + Math.min(travel, Math.max(0, item.offsetLeft - (w - item.offsetWidth) / 2)) / speed);
      return [...stops, run].sort((a, b) => a - b).find(x => x > from + 4);
    };
    const step = () => {
      halt();
      if (!active || stopped || !run || !autoplayOn()) return;
      const top = runway.getBoundingClientRect().top + window.scrollY;
      const from = Math.min(run, Math.max(0, window.scrollY - top));
      // Still inside the hold, where nothing moves: skip to its end at once (the screen does not
      // change) and rest there, so the first card gets the same rest as the others.
      if (from < held - 4) {
        setY(top + held);
        phase = 'rest';
        timer = window.setTimeout(step, 1800 / speed);
        return;
      }
      const to = nextStop(from);
      if (to === undefined) return; // at the end: the page scrolls on normally from here
      const dist = to - from;
      const ms = Math.min(3200, Math.max(700, (dist / 240) * 1000)); // dist is runway px, so a faster strip glides quicker
      const t0 = performance.now();
      let last = window.scrollY;
      phase = 'glide';
      const tick = (now: number) => {
        // Something else moved the page (a scrollbar drag, a jump): stop and leave it be.
        if (Math.abs(window.scrollY - last) > 3) { stopped = true; halt(); return; }
        const k = Math.min(1, (now - t0) / ms);
        setY(top + from + dist * (0.5 - Math.cos(Math.PI * k) / 2));
        last = window.scrollY;
        if (k < 1) glide = requestAnimationFrame(tick);
        else { glide = 0; phase = 'rest'; timer = window.setTimeout(step, 1800 / speed); }
      };
      glide = requestAnimationFrame(tick);
    };
    // Wait for the page to sit still (three checks 250ms apart) before the first glide, so a
    // visitor still scrolling in, or a jump passing through, is never grabbed.
    const settle = (y: number, still: number) => {
      phase = 'settle';
      timer = window.setTimeout(() => {
        const now = window.scrollY;
        if (Math.abs(now - y) >= 1) settle(now, 0);
        else if (still >= 2) step();
        else settle(now, still + 1);
      }, 250);
    };
    const setActive = (now: boolean) => {
      if (now === active) return;
      active = now;
      halt();
      if (!now) stopped = false;
      else if (autoplayOn()) settle(window.scrollY, 0);
    };
    // Input hands control back. While waiting to start, only a press or a key counts, since the
    // wheel that scrolled the strip in is still turning.
    const takeOver = (event: Event) => {
      if (phase === 'idle' || (phase === 'settle' && (event.type === 'wheel' || event.type === 'touchstart'))) return;
      stopped = true;
      halt();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || !active || event.repeat) return;
      if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.documentElement.dataset.chat || document.querySelector('[aria-modal="true"], dialog[open], .site-header[data-menu-open]')) return;
      event.preventDefault();
      stopped = true;
      halt();
      scrollToY(runway.getBoundingClientRect().bottom + window.scrollY);
    };
    // A sideways swipe moves the page by the same distance, so the strip follows the finger.
    let swipe: { x: number; y: number; id: number; on: boolean } | null = null;
    const onSwipeDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !active) return;
      swipe = { x: event.clientX, y: event.clientY, id: event.pointerId, on: false };
    };
    const onSwipeMove = (event: PointerEvent) => {
      if (!swipe || event.pointerId !== swipe.id) return;
      const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
      if (!swipe.on) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        swipe.on = true;
        stopped = true;
        halt();
      }
      swipe.x = event.clientX;
      setY(window.scrollY - dx * speed);
    };
    const onSwipeEnd = (event: PointerEvent) => { if (swipe && event.pointerId === swipe.id) swipe = null; };
    // The button flipped the shared setting: on starts from here at once, off stops.
    const onSetting = () => {
      if (!autoplayOn()) { halt(); return; }
      stopped = false;
      if (active) step();
    };
    const inputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

    runway.setAttribute('data-pin', '');
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    ro.observe(frame);
    ro.observe(document.body);
    nearIO.observe(runway);
    window.addEventListener('scroll', schedule, { passive: true });
    track.addEventListener('focusin', onFocus);
    // Capture phase: these run before Lenis sees the same wheel, so the glide stops first.
    inputs.forEach(type => window.addEventListener(type, takeOver, { capture: true, passive: true }));
    window.addEventListener('keydown', onKey);
    frame.addEventListener('pointerdown', onSwipeDown, { passive: true });
    frame.addEventListener('pointermove', onSwipeMove, { passive: true });
    frame.addEventListener('pointerup', onSwipeEnd, { passive: true });
    frame.addEventListener('pointercancel', onSwipeEnd, { passive: true });
    const unsubscribe = subscribeAutoplay(onSetting);
    return () => {
      cancelAnimationFrame(raf);
      halt();
      inputs.forEach(type => window.removeEventListener(type, takeOver, { capture: true }));
      window.removeEventListener('keydown', onKey);
      frame.removeEventListener('pointerdown', onSwipeDown);
      frame.removeEventListener('pointermove', onSwipeMove);
      frame.removeEventListener('pointerup', onSwipeEnd);
      frame.removeEventListener('pointercancel', onSwipeEnd);
      unsubscribe();
      ro.disconnect();
      nearIO.disconnect();
      window.removeEventListener('scroll', schedule);
      track.removeEventListener('focusin', onFocus);
      markActive(runway, false);
      runway.removeAttribute('data-pin');
      runway.style.removeProperty('--run');
      runway.style.removeProperty('--p');
      track.style.transform = '';
      items.forEach(item => item.classList.remove('hs-in'));
    };
  }, [pinned, speed, hold]);

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
    const travel = Math.max(0, track.scrollWidth - frame.clientWidth);
    const held = travel ? hold * window.innerHeight : 0;
    const y = runway.getBoundingClientRect().top + window.scrollY + held + Math.min(1, Math.max(0, p)) * (travel / speed);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, immediate ? { immediate: true } : { duration });
    else window.scrollTo({ top: y });
  }, [speed, hold]);

  // Scroll to just past the section: the way out of a pinned strip.
  const scrollPast = useCallback(() => {
    const runway = runwayRef.current;
    if (runway) scrollToY(runway.getBoundingClientRect().bottom + window.scrollY);
  }, []);

  return { runwayRef, trackRef, pinned, progressOf, scrollToProgress, scrollPast };
}
