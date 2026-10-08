'use client';
import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { WORK_HEAD } from '@/lib/site';

// The Carousel | Desk switch over projects 02 to 06 (Andrew 2026-10-07: "toggle a view so that
// you can turn off the carousel and make them into floating tabs"). Carousel shows `children`
// (the fan, rendered on the server in app/sections/projects.tsx); Desk shows the floating tabs.
// The choice is remembered in localStorage, read after mount so the server's markup (always the
// carousel) and the first client render agree.
//
// Pattern: React.lazy + Suspense. The desk's code is a separate file the browser fetches only the
// first time someone switches to it, so the page does not pay for a view most never open.

const FloatingTabs = lazy(() => import('./floating-tabs'));
const KEY = 'andliu:work-view';
type View = 'carousel' | 'desk';

export function WorkViews({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('carousel');

  useEffect(() => {
    try { if (localStorage.getItem(KEY) === 'desk') setView('desk'); } catch { /* storage blocked: stay on the carousel */ }
  }, []);

  const choose = (next: View) => {
    setView(next);
    try { localStorage.setItem(KEY, next); } catch { /* storage blocked: the choice lasts this visit */ }
  };

  return (
    <div className="wk-views" data-view={view}>
      <div className="wk-views-bar">
        <div className="wk-switch" role="group" aria-label={WORK_HEAD.views}>
          {(['carousel', 'desk'] as const).map(option => (
            <button key={option} type="button" aria-pressed={view === option} onClick={() => choose(option)}>
              {WORK_HEAD[option]}
            </button>
          ))}
        </div>
      </div>
      {view === 'carousel' ? children : <Suspense fallback={null}><FloatingTabs /></Suspense>}
    </div>
  );
}

export default WorkViews;
