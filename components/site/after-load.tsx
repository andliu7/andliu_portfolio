'use client';
import { useEffect, useState, type ReactNode } from 'react';

// Holds back below-the-fold work until the first screen is up. "Up" is html.is-loaded, which the
// loader (components/site/loader.tsx) sets when its count reaches 100 and the sheet lifts, or
// which the loader's skip path and the BOOT failsafe (app/layout.tsx) set; then it waits for the
// browser's next idle moment (requestIdleCallback, at most IDLE_MS later), so the deferred work
// does not land in the middle of the pan.
//
// Why: React hydrates the whole page in one go, and every client component's useEffect runs in
// that same task. A WebGL scene or a canvas loop below the fold that sets itself up in its effect
// delays the loader's next frame, and so the moment the hero is shown. Wrapped, it starts after.
//
//   <AfterLoad placeholder={<div className="flag-still" />}><Flag /></AfterLoad>
//   const ready = useAfterLoad(); useEffect(() => { if (!ready) return; ...start the loop... }, [ready]);
//
// For things far down the page, NearViewport (near-viewport.tsx) is still the better tool: it
// waits until they are close to the screen. AfterLoad is for things that should start soon after
// the first screen, but not before it.

const IDLE_MS = 1200;

export function useAfterLoad() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    let idle = 0, timer = 0;
    const go = () => {
      // Safari has no requestIdleCallback; a short timeout stands in for it there.
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(() => setReady(true), { timeout: IDLE_MS });
      else timer = window.setTimeout(() => setReady(true), 200);
    };
    // A MutationObserver calls back when <html>'s class list changes, so this needs no polling.
    const watch = new MutationObserver(() => { if (root.classList.contains('is-loaded')) { watch.disconnect(); go(); } });
    if (root.classList.contains('is-loaded')) go();
    else watch.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => {
      watch.disconnect();
      if (idle) window.cancelIdleCallback(idle); // only set where requestIdleCallback exists
      window.clearTimeout(timer);
    };
  }, []);
  return ready;
}

export function AfterLoad({ children, placeholder = null }: { children: ReactNode; placeholder?: ReactNode }) {
  return useAfterLoad() ? children : placeholder;
}

export default AfterLoad;
