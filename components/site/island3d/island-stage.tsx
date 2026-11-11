'use client';
import { Component, lazy, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IMAGES, ISLAND } from '@/lib/site';
import type { Focus } from './island-scene';
import { LANDMARKS } from './landmarks';
import { NearViewport } from '@/components/site/near-viewport';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// The island's stage in #island (app/sections/island.tsx): the round 3D island in its night sea
// (island-scene.tsx), or the game's poster where that cannot run.
//
//   WebGL           the scene, downloaded (its own chunk: three.js and @react-three/fiber) only
//                   when the section comes within 60% of a screen of the viewport, unmounted again
//                   past 150% (which frees the WebGL context), and paused while off screen.
//                   The canvas covers the whole section (the sea runs edge to edge, behind the
//                   words); this box stays the door's click target, and the scene frames the
//                   island inside it from the box measured here. The canvas fades in once its
//                   first frame is drawn.
//   reduced motion  the same scene drawn once, still: no turn, no bob, no clouds drifting.
//   no WebGL        the poster, cropped round, so the island is still a round island.
//   the scene throws  the poster too (the boundary below).
//
// The landmarks' names: once the scene is drawn, one button per landmark sits over its building
// (the scene moves and sizes them every frame). They live in .il-marks, which island.tsx puts
// beside the island's link, not inside it, so clicking a building never opens the "Head to the
// island?" door. Hover, focus or a click shows a small label with the building's name; a click
// pins it until another click, Escape or a click elsewhere.

const Scene = lazy(() => import('./island-scene'));
const poster = IMAGES[ISLAND.poster];

// Is WebGL available? Asked once on the client; the server says "unknown" (null).
let webgl: boolean | null = null;
function hasWebGL() {
  if (webgl === null) {
    try {
      const c = document.createElement('canvas');
      webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { webgl = false; }
  }
  return webgl;
}
const noop = () => () => {};

function Poster() {
  return (
    <img
      className="il-poster"
      src={poster.srcset[0].src}
      srcSet={poster.srcset.map(s => `${s.src} ${s.w}w`).join(', ')}
      sizes="(min-width: 900px) 50vw, 86vw"
      width={poster.w} height={poster.h} alt=""
      loading="lazy" decoding="async"
    />
  );
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Marks({ host, els, open, setOpen }: { host: HTMLElement; els: { current: (HTMLElement | null)[] }; open: number | null; setOpen: (i: number | null) => void }) {
  return createPortal(
    LANDMARKS.map((m, i) => (
      <button
        key={m.id} type="button" className="il-mark" data-on={open === i ? '' : undefined}
        ref={el => { els.current[i] = el; }}
        // A portal's events still bubble up the React tree, through the door's onClick: stop them here.
        onClick={e => { e.stopPropagation(); setOpen(open === i ? null : i); }}
        onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') setOpen(null); }}
      >
        <span className="il-mark-label">{m.name}</span>
      </button>
    )),
    host,
  );
}

export function IslandStage() {
  const gl = useSyncExternalStore(noop, hasWebGL, () => null);
  const still = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [failed, setFailed] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const marks = useRef<(HTMLElement | null)[]>([]);

  // The marks' layer, beside the door in .il-island (island.tsx).
  useEffect(() => { setHost(ref.current?.closest('.il-island')?.querySelector<HTMLElement>('.il-marks') ?? null); }, []);

  // A pinned label lets go on a click anywhere else.
  useEffect(() => {
    if (open === null) return;
    const away = (e: PointerEvent) => { if (!(e.target as Element | null)?.closest?.('.il-mark')) setOpen(null); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  // Fetch the scene's code early, once the visitor reaches Contact ("compare notes"), two sections
  // above, so it is ready by the time they scroll down (Andrew 2026-11-04).
  useEffect(() => {
    const contact = document.querySelector('#contact');
    if (!contact) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { void import('./island-scene'); io.disconnect(); } });
    io.observe(contact);
    return () => io.disconnect();
  }, []);

  // Pause the render loop while the section (all of it is sea) is off screen; it may still be
  // mounted within the margin.
  useEffect(() => {
    const el = ref.current?.closest('section') ?? ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Where this box sits in the section, which is where the scene puts the island.
  useEffect(() => {
    const box = ref.current, section = box?.closest('section');
    if (!box || !section) return;
    const measure = () => {
      const s = section.getBoundingClientRect(), b = box.getBoundingClientRect();
      const next = { x: Math.round(b.left - s.left), y: Math.round(b.top - s.top), w: Math.round(b.width), h: Math.round(b.height) };
      setFocus(f => f && f.x === next.x && f.y === next.y && f.w === next.w && f.h === next.h ? f : next);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    ro.observe(box);
    measure();
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="il-stage" data-ready={ready || gl === false ? '' : undefined}>
      {gl === false ? <Poster /> : gl === null ? null : (
        <NearViewport placeholder={null} margin="150%" unmountMargin="250%" className="il-gl">
          <Boundary fallback={<Poster />} onError={() => setFailed(true)}>
            <Scene still={still} paused={!onScreen} focus={focus} onReady={() => setReady(true)} marks={marks} />
          </Boundary>
        </NearViewport>
      )}
      {gl && ready && !failed && host && <Marks host={host} els={marks} open={open} setOpen={setOpen} />}
    </div>
  );
}

export default IslandStage;
