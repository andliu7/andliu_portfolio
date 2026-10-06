'use client';
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { isFinePointer } from '@/components/site/use-fine-pointer';

// The mascot's loader (SITE-PLAN.md 7). Renders nothing on the server and nothing at first on the
// client. After the page goes idle it mounts the berry only when all three hold:
//  - a mouse or trackpad (no mascot on touch screens)
//  - full motion (no html[data-motion="reduced"])
//  - the menu switch is on (no html[data-mascot="off"])
// It keeps watching those, so turning the switch or Motion off unmounts the berry at once.
// Keep the default export named MascotSlot: app/layout.tsx imports it.

// Pattern: React.lazy. The import() runs the first time <Mascot /> renders, so the mascot's code
// is a separate download that touch screens and reduced motion never fetch.
const Mascot = lazy(() => import('./mascot'));

// The berry is decoration: if its chunk fails to load or it throws, it must take nothing else down
// with it. Pattern: an error boundary (React only offers these as class components). It catches
// errors thrown while rendering its children, including a failed lazy import, and renders nothing.
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function allowed() {
  const root = document.documentElement;
  return isFinePointer() && root.getAttribute('data-motion') !== 'reduced' && root.getAttribute('data-mascot') !== 'off';
}

export default function MascotSlot() {
  const [idle, setIdle] = useState(false);
  const [ok, setOk] = useState(false);

  // Wait for idle time (or 1.2s where requestIdleCallback does not exist, Safari).
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setIdle(true), 1200);
    return () => clearTimeout(id);
  }, []);

  // Re-check whenever <html>'s data-motion or data-mascot changes, or the pointer type does.
  useEffect(() => {
    const check = () => setOk(allowed());
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion', 'data-mascot'] });
    const media = window.matchMedia('(pointer: fine) and (hover: hover)');
    media.addEventListener('change', check);
    return () => { observer.disconnect(); media.removeEventListener('change', check); };
  }, []);

  if (!idle || !ok) return null;
  return (
    <Quiet>
      <Suspense fallback={null}>
        <Mascot />
      </Suspense>
    </Quiet>
  );
}
