'use client';
import { lazy, Suspense, useEffect, useState } from 'react';
import { WorldPoster } from './WorldPoster';
import type { Caption } from './Prop';

// The gate. Decides once per viewer whether the world is a live Canvas or a drawing:
// wide screen, no reduced-motion preference, WebGL available. Everything 3D is behind
// React.lazy, so the drawing is all a phone ever downloads.
//
// Pattern: React.lazy at module level plus Suspense. The import runs only when
// <WorldCanvas> first renders, which only happens on the client after the check.

const WorldCanvas = lazy(() => import('./WorldCanvas'));

function canRender3D() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export default function World() {
  const [live, setLive] = useState(false);
  const [caption, setCaption] = useState<Caption>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
    const apply = () => setLive(mq.matches && canRender3D());
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <div className="world" aria-hidden="true">
      {live
        ? <Suspense fallback={<WorldPoster />}><WorldCanvas onCaption={setCaption} /></Suspense>
        : <WorldPoster />}
      <div className={caption ? 'world-caption on' : 'world-caption'} style={caption ? { left: caption.x, top: caption.y } : undefined}>
        {caption?.label}
      </div>
    </div>
  );
}
