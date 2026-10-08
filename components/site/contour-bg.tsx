'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './contour-bg.css';

// Topographic contour lines behind the berry-deep sections only (Where to?, Projects, Impact,
// Experience), after landonorris.com: thin lines a little lighter than the ground. Andrew asked
// for it on "that dark blue background" only; he turned down lines on the hero, so no other
// ground gets them. They hold still (Andrew 2026-10-07: the lines should not move at all).
//
// Mounted once in app/page.tsx. It finds every berry-deep section, appends one empty host <div>
// to each, and renders a canvas into each host, so no section file has to know about it.
//
// How the frame is drawn: a grid of gradient-noise values (one every CELL px) is sampled over the
// canvas (one screen tall, sticky), and marching squares traces where the field crosses each of
// LEVELS heights; every crossing is a short line segment, all stroked in one go. The section's
// page offset seeds the sample position, so each section shows its own patch of the map.
// Cost: one draw on mount, and again only when the canvas resizes or the device pixel ratio
// changes. No animation loop and no pointer or scroll work, so reduced motion needs no branch.
// The backing store is the device pixel ratio snapped to whole pixels, so 1px lines stay sharp
// on Retina (a single still frame makes the full ratio cheap).

const CELL = 10; // px between grid samples
const SCALE = 520; // px across one noise feature (bigger = broader hills)
const LEVELS = 9; // contour heights between 0 and 1: about 5 lines across a screen, 80 to 200px apart
const DETAIL = 0.12; // weight of a second, finer noise layer; kept low so it bends lines without making islets
const TURN = 0.6; // radians the noise is rotated, so its square lattice does not lean the shapes along the axes
const COS = Math.cos(TURN), SIN = Math.sin(TURN);

export default function ContourBg() {
  const [hosts, setHosts] = useState<HTMLElement[]>([]);

  useEffect(() => {
    const made = Array.from(document.querySelectorAll<HTMLElement>('main section[id][data-ground="berry-deep"]')).map(section => {
      const host = document.createElement('div');
      host.className = 'contour-host';
      host.setAttribute('aria-hidden', 'true');
      section.appendChild(host);
      return host;
    });
    // Setting state from an effect is fine here: the hosts only exist after the page is in the DOM.
    setHosts(made);
    return () => made.forEach(h => h.remove());
  }, []);

  // createPortal renders a React child into a DOM node outside this component's own place in the
  // tree (here, the host inside each section), while React still owns and cleans it up.
  return <>{hosts.map((host, i) => createPortal(<ContourCanvas />, host, String(i)))}</>;
}

function ContourCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  // One effect draws the still frame and redraws it on resize; its cleanup removes the observers.
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const section = host?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !section || !ctx) return;

    const colour = getComputedStyle(host).getPropertyValue('--contour').trim() || 'rgba(201,209,244,.16)';

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      // Map CSS px onto the whole-pixel backing store exactly, so nothing is resampled.
      ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
      const cols = Math.ceil(w / CELL) + 1, rows = Math.ceil(h / CELL) + 1;
      const field = new Float32Array(cols * rows);
      const top = section.offsetTop; // a layout read, but only on mount and resize
      for (let j = 0; j < rows; j++) {
        const y = j * CELL;
        for (let i = 0; i < cols; i++) {
          const x = i * CELL;
          const px = x / SCALE, py = (y + top) / SCALE;
          const sx = px * COS - py * SIN, sy = px * SIN + py * COS;
          field[j * cols + i] = (1 - DETAIL) * noise(sx, sy, 0) + DETAIL * noise(sx * 1.6 + 5.3, sy * 1.6 - 1.7, 0);
        }
      }
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = field[j * cols + i], b = field[j * cols + i + 1];
          const c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
          const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
          for (let k = Math.ceil(lo * LEVELS); k <= hi * LEVELS; k++) {
            if (k <= 0) continue;
            trace(ctx, k / LEVELS, i * CELL, j * CELL, a, b, c, d);
          }
        }
      }
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    // ResizeObserver also fires once when it starts observing: that first call is the mount draw.
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    // A DPR change (browser zoom, moving the window to another screen) need not resize the canvas
    // in CSS px, so watch the ratio itself; the query is rebuilt for the new ratio each time.
    let dprQuery: MediaQueryList | null = null;
    const watchDpr = () => {
      dprQuery?.removeEventListener('change', onDpr);
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      dprQuery.addEventListener('change', onDpr);
    };
    const onDpr = () => { draw(); watchDpr(); };
    watchDpr();

    return () => { ro.disconnect(); dprQuery?.removeEventListener('change', onDpr); };
  }, []);

  return <canvas ref={ref} className="contour-canvas" />;
}

// Marching squares for one cell and one level. Corners a b c d run clockwise from top left; each
// edge the level crosses gets a point placed by linear interpolation, and the points pair up.
function trace(ctx: CanvasRenderingContext2D, lv: number, x: number, y: number, a: number, b: number, c: number, d: number) {
  const pts: number[] = [];
  const edge = (p: number, q: number, x0: number, y0: number, x1: number, y1: number) => {
    if ((p < lv) === (q < lv)) return;
    const f = (lv - p) / (q - p);
    pts.push(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
  };
  edge(a, b, x, y, x + CELL, y);
  edge(b, c, x + CELL, y, x + CELL, y + CELL);
  edge(c, d, x + CELL, y + CELL, x, y + CELL);
  edge(d, a, x, y + CELL, x, y);
  for (let n = 0; n + 3 < pts.length; n += 4) {
    ctx.moveTo(pts[n], pts[n + 1]);
    ctx.lineTo(pts[n + 2], pts[n + 3]);
  }
}

// 3D gradient (Perlin) noise in about 0..1. Each lattice corner gets a random direction rather than a
// random height, which gives long flowing ridges instead of value noise's blobs and ring clusters.
function hash(x: number, y: number, z: number) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// The 12 edge directions of a cube, Perlin's standard gradient set.
const GRAD = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];

function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const fade = (f: number) => f * f * f * (f * (f * 6 - 15) + 10);
  const u = fade(fx), v = fade(fy), s = fade(fz);
  const lerp = (p: number, q: number, k: number) => p + (q - p) * k;
  const dot = (i: number, j: number, k: number) => {
    const g = GRAD[(hash(xi + i, yi + j, zi + k) * 12) | 0];
    return g[0] * (fx - i) + g[1] * (fy - j) + g[2] * (fz - k);
  };
  const layer = (k: number) => lerp(lerp(dot(0, 0, k), dot(1, 0, k), u), lerp(dot(0, 1, k), dot(1, 1, k), u), v);
  return 0.5 + 0.5 * lerp(layer(0), layer(1), s);
}
