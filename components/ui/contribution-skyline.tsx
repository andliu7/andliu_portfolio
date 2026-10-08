'use client';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import './contribution-skyline.css';

// The contribution skyline: a day-by-day heat map (columns are weeks, rows are weekdays) that
// folds up into an isometric skyline. One camera swings from straight down to a corner view
// while each week's bars rise in a wave, oldest week first. A smaller take on the 21st.dev
// ContributionSkyline Andrew pasted (no orbit drag, no palette presets, no corner stats: the
// Impact panel's own big number and stat tile carry those). It opens flat, the view where every
// day can be read, then raises the city by itself (Andrew 2026-10-07: "do the animation
// automatically"): each time the stage comes into view, the camera swings and the weeks rise, and
// once standing it sways slowly a few degrees side to side, so it stays alive. Leaving the view
// lays it flat again, ready to replay; the panel's accordion remounts it on every open, so opening
// the row replays it too. The 2D / 3D toggle still works, and a press on it is a choice: the auto
// play and the sway stop for good on that mount. Reduced motion: it stands in 3D, still.
//
// It lives in an Impact panel (app/sections/impact.client.tsx), loaded with React.lazy like
// components/ui/chart.tsx, and borrows that section's tooltip (.impact-tip) and token palette.
// The panel's "Show the numbers" table is the accessible alternative to the drawing.
//
// Drawing is plain canvas 2D. Everything that changes every frame (the morph's progress, the
// projected shapes used for hit testing) lives in refs, not state, so React does not re-render
// sixty times a second; state holds only what the DOM shows (the mode, the active day).

type Day = { x: string; y: number };
type Labels = {
  view: string;
  flat: string;
  city: string;
  less: string;
  more: string;
  day: (n: number, unit: string, date: string) => string;
  label: (total: number, unit: string, first: string, last: string) => string;
};
type Props = { points: Day[]; unit: string; reduced: boolean; labels: Labels };

const MORPH_MS = 1300;
const SWAY_DEG = 4; // the sway's reach either side of the corner view
const SWAY_MS = 9000; // one full sway, left and back
const SWAY_EASE_MS = 1200; // how long the sway takes to grow in or die away
const RAD = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const utc = (x: string) => new Date(`${x}T00:00:00Z`);
const fmtDate = (x: string) => utc(x).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const fmtLong = (x: string) => utc(x).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** A heat map from straight down (e = 0) to the corner view (e = 1), turned `sway` degrees more. */
function camera(e: number, sway = 0) {
  const yaw = (lerp(0, 45, e) + sway * e) * RAD;
  const elev = lerp(90, 30, e) * RAD;
  return { cs: Math.cos(yaw), sn: Math.sin(yaw), se: Math.sin(elev), ce: Math.cos(elev) };
}
type Cam = ReturnType<typeof camera>;
const projX = (c: Cam, x: number, y: number) => x * c.cs - y * c.sn;
const projY = (c: Cam, x: number, y: number, z: number) => (x * c.sn + y * c.cs) * c.se - z * c.ce;

/** How far a bar has risen at morph progress t: older weeks first, then down the week. */
const riseAt = (t: number, week: number, weeks: number, day: number) =>
  easeOutCubic(clamp01((t - (week / Math.max(1, weeks - 1)) * 0.36 - (day / 6) * 0.06) / (1 - 0.42)));

/** Bar height in cell units. Empty days stay thin slabs, so the grid still reads in 3D. */
const barHeight = (count: number, max: number) => (count > 0 ? 0.25 + (count / max) ** 0.85 * 3.4 : 0.1);

const hexRgb = (hex: string) => {
  const h = hex.trim().replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
};
const shade = (rgb: number[], k: number) => `rgb(${rgb.map(v => Math.round(v * k)).join(',')})`;

function inPoly(poly: number[], px: number, py: number) {
  let inside = false;
  for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
    const [xi, yi, xj, yj] = [poly[i], poly[i + 1], poly[j], poly[j + 1]];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export default function ContributionSkyline({ points, unit, reduced, labels }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [active, setActive] = useState<number | null>(null);
  const [said, setSaid] = useState('');
  // Refs the draw loop reads. The engine effect below reads these instead of props or state,
  // so it is set up once and never torn down when the mode or the active day changes.
  const target = useRef(0);
  const progress = useRef(0);
  const sway = useRef(0); // degrees off the corner view this frame
  const swayOn = useRef(false); // should the sway be running (the auto play, standing, on screen)
  const chosen = useRef(false); // the visitor pressed 2D or 3D: no more auto play or sway
  const activeRef = useRef<number | null>(null);
  const engine = useRef<{ kick: () => void; draw: () => void; hit: (x: number, y: number) => number | null } | null>(null);

  // useMemo: the grid layout and colour levels are derived once per data set, not per render.
  const grid = useMemo(() => {
    const max = Math.max(1, ...points.map(p => p.y));
    const nonZero = points.map(p => p.y).filter(y => y > 0).sort((a, b) => a - b);
    const busy = nonZero.length ? nonZero[Math.min(nonZero.length - 1, Math.floor(nonZero.length * 0.95))] : 1;
    const cells = points.map((p, i) => ({
      week: Math.floor(i / 7),
      day: i % 7,
      count: p.y,
      level: p.y === 0 ? 0 : 1 + Math.min(3, Math.floor((p.y / busy) * 4)),
      h: barHeight(p.y, max),
    }));
    const weeks = Math.ceil(points.length / 7);
    // A month name over the first column whose Monday falls in a new month. A month that gets
    // fewer than two columns before the next one starts is left unnamed, so names never collide.
    const starts: { week: number; name: string }[] = [];
    for (let w = 0; w < weeks; w++) {
      const d = utc(points[w * 7].x);
      if (w === 0 || d.getUTCMonth() !== utc(points[(w - 1) * 7].x).getUTCMonth()) {
        starts.push({ week: w, name: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) });
      }
    }
    const months = starts.filter((m, i) => (starts[i + 1]?.week ?? weeks) - m.week >= 2);
    // Every other weekday on the left, named from the data's own first week.
    const days = [0, 2, 4].filter(d => d < points.length).map(d => ({ day: d, name: utc(points[d].x).toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' }) }));
    const total = points.reduce((n, p) => n + p.y, 0);
    return { cells, weeks, months, days, total };
  }, [points]);

  // The engine: canvas sizing, the morph loop, drawing and hit testing. Set up once per data set.
  useEffect(() => {
    const box = wrap.current;
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!box || !cv || !ctx) return;
    const css = getComputedStyle(cv);
    const tok = (name: string) => css.getPropertyValue(name).trim();
    const ramp = ['--sk-0', '--sk-1', '--sk-2', '--sk-3', '--sk-4'].map(n => hexRgb(tok(n)));
    const edge = tok('--sk-edge');
    const ink = tok('--ink');
    const muted = tok('--muted');
    const font = `500 12px ${css.fontFamily}`;
    const { cells, weeks } = grid;
    // Projected shapes from the last frame, for hit testing: [top, left side, right side].
    let shapes: number[][][] = [];
    let pitch = 0; // one cell's width in px at the last frame, for the flat view's hit areas
    let w = 0;
    let h = 0;
    let frame = 0;
    let last = 0;
    let swayAmp = 0; // the sway's current reach, eased toward SWAY_DEG or 0
    let swayPhase = 0; // radians along the sway's sine

    const draw = () => {
      const t = progress.current;
      const e = easeInOutCubic(t);
      const c = camera(e, sway.current);
      ctx.setTransform(Math.min(2, window.devicePixelRatio || 1), 0, 0, Math.min(2, window.devicePixelRatio || 1), 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Fit: the projected extent of the whole grid at full height for THIS camera, so the
      // scale follows the camera only and the rising bars never make the scene zoom.
      // The sway is fitted too: the scale is the smallest over both ends of the sway, so the
      // scene turns without breathing in and out.
      // The extent is the floor's four corners plus every bar's top at its full height (not its
      // height this frame), so the city fills the stage yet nothing zooms while the weeks rise.
      const extent = (cam: Cam) => {
        const pts = [0, weeks].flatMap(x => [0, 7].map(y => [projX(cam, x, y), projY(cam, x, y, 0)]));
        for (const cell of cells) for (const [x, y] of [[cell.week, cell.day], [cell.week + 1, cell.day], [cell.week, cell.day + 1], [cell.week + 1, cell.day + 1]]) pts.push([projX(cam, x, y), projY(cam, x, y, cell.h)]);
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
      };
      const { minX, maxX, minY, maxY } = extent(c);
      const pad = { l: lerp(40, 8, e), r: 8, t: lerp(22, 8, e), b: lerp(6, 26, e) };
      // The drawing fills the stage: the cell size comes from the stage, whichever side binds.
      const fit = (x: ReturnType<typeof extent>) => Math.min((w - pad.l - pad.r) / (x.maxX - x.minX), (h - pad.t - pad.b) / (x.maxY - x.minY));
      const scale = Math.min(fit(extent(c)), ...(e > 0 ? [fit(extent(camera(e, SWAY_DEG))), fit(extent(camera(e, -SWAY_DEG)))] : []));
      pitch = scale;
      const ox = pad.l + (w - pad.l - pad.r - (maxX - minX) * scale) / 2 - minX * scale;
      const oy = pad.t + (h - pad.t - pad.b - (maxY - minY) * scale) / 2 - minY * scale;
      const P = (x: number, y: number, z: number) => [ox + projX(c, x, y) * scale, oy + projY(c, x, y, z) * scale];

      const cw = lerp(0.78, 0.9, e);
      const radius = lerp(0.17, 0.03, e) * cw * scale;
      const order = cells.map((_, i) => i).sort((a, b) => {
        const da = (cells[a].week + 0.5) * c.sn + (cells[a].day + 0.5) * c.cs;
        const db = (cells[b].week + 0.5) * c.sn + (cells[b].day + 0.5) * c.cs;
        return da - db;
      });
      shapes = [];
      for (const i of order) {
        const cell = cells[i];
        const x0 = cell.week + (1 - cw) / 2;
        const y0 = cell.day + (1 - cw) / 2;
        const x1 = x0 + cw;
        const y1 = y0 + cw;
        const z = cell.h * riseAt(t, cell.week, weeks, cell.day);
        const rgb = ramp[cell.level];
        const top = [...P(x0, y0, z), ...P(x1, y0, z), ...P(x1, y1, z), ...P(x0, y1, z)];
        const left = [...P(x0, y1, 0), ...P(x1, y1, 0), ...P(x1, y1, z), ...P(x0, y1, z)];
        const right = [...P(x1, y0, 0), ...P(x1, y1, 0), ...P(x1, y1, z), ...P(x1, y0, z)];
        shapes[i] = [top, left, right];
        if (z * c.ce * scale > 0.3) {
          for (const [face, k] of [[left, 0.84], [right, 0.68]] as const) {
            ctx.beginPath();
            ctx.moveTo(face[0], face[1]);
            for (let k2 = 2; k2 < 8; k2 += 2) ctx.lineTo(face[k2], face[k2 + 1]);
            ctx.closePath();
            ctx.fillStyle = shade(rgb, k);
            ctx.fill();
          }
        }
        // The top face, with corners rounded through arcTo so it works at any camera angle.
        ctx.beginPath();
        ctx.moveTo((top[6] + top[0]) / 2, (top[7] + top[1]) / 2);
        for (let k = 0; k < 4; k++) {
          const n = (k + 1) % 4;
          ctx.arcTo(top[k * 2], top[k * 2 + 1], top[n * 2], top[n * 2 + 1], radius);
        }
        ctx.closePath();
        ctx.fillStyle = shade(rgb, 1);
        ctx.fill();
        // Flat, an empty day is an outlined slot (the edge is 3.24:1 on the card), so it reads
        // apart from a one-commit day by shape as well as by lightness.
        if (e < 1) {
          ctx.globalAlpha = (1 - e) * (cell.level === 0 ? 1 : 0.1);
          ctx.strokeStyle = cell.level === 0 ? edge : ink;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (activeRef.current === i) {
          ctx.strokeStyle = ink;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Labels fade, never pop: months on top and weekdays on the left while flat, months along
      // the front edge once it stands up.
      ctx.font = font;
      ctx.fillStyle = muted;
      if (e < 1) {
        ctx.globalAlpha = 1 - e;
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';
        for (const m of grid.months) { const [x, y] = P(m.week + (1 - cw) / 2, 0, 0); ctx.fillText(m.name, x, y - 5); }
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        for (const d of grid.days) { const [x, y] = P(0, d.day + 0.5, 0); ctx.fillText(d.name, x - 8, y); }
      }
      if (e > 0) {
        ctx.globalAlpha = e;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        for (const m of grid.months) { const [x, y] = P(m.week + 0.5, 7.3, 0); ctx.fillText(m.name, x, y); }
      }
      ctx.globalAlpha = 1;

      // The tooltip rides its cell through the morph: placed here, by hand, every frame. Above
      // the cell when it fits inside the stage, otherwise below it, so it never covers the title.
      const el = tip.current;
      const a = activeRef.current;
      if (el && a !== null && shapes[a]) {
        const s = shapes[a][0];
        const tx = (s[0] + s[2] + s[4] + s[6]) / 4;
        const above = Math.min(s[1], s[3], s[5], s[7]) - el.offsetHeight - 8;
        const ty = above >= 0 ? above : Math.max(s[1], s[3], s[5], s[7]) + 8;
        const half = el.offsetWidth / 2;
        el.style.transform = `translate(${Math.round(Math.min(w - half, Math.max(half, tx)) - half)}px, ${Math.round(ty)}px)`;
      }
    };

    const step = (now: number) => {
      const dt = last ? now - last : 16;
      last = now;
      const goal = target.current;
      const t = progress.current;
      progress.current = goal > t ? Math.min(goal, t + dt / MORPH_MS) : Math.max(goal, t - dt / MORPH_MS);
      // The sway grows in once the city stands, and dies away when it should stop.
      const swayGoal = swayOn.current && progress.current === 1 && goal === 1 ? SWAY_DEG : 0;
      swayAmp = swayGoal > swayAmp ? Math.min(swayGoal, swayAmp + (SWAY_DEG * dt) / SWAY_EASE_MS) : Math.max(swayGoal, swayAmp - (SWAY_DEG * dt) / SWAY_EASE_MS);
      if (swayAmp > 0) swayPhase += (2 * Math.PI * dt) / SWAY_MS;
      else swayPhase = 0;
      sway.current = swayAmp * Math.sin(swayPhase);
      draw();
      // Draw only while moving: the loop stops itself once the morph has settled and no sway runs.
      frame = progress.current === goal && swayAmp === 0 ? 0 : requestAnimationFrame(step);
      if (!frame) last = 0;
    };
    const kick = () => { if (!frame) frame = requestAnimationFrame(step); };

    const hit = (px: number, py: number) => {
      // Flat: each day owns its whole square of the grid, gap included, so a near miss on a
      // phone still lands on the nearest day.
      if (progress.current === 0) {
        let best: number | null = null;
        let bestD = pitch / 2;
        shapes.forEach(([top], i) => {
          const d = Math.max(Math.abs(px - (top[0] + top[4]) / 2), Math.abs(py - (top[1] + top[5]) / 2));
          if (d <= bestD) { bestD = d; best = i; }
        });
        return best;
      }
      // Standing: front to back, the reverse of the painting order is the nearest shape first.
      const c = camera(easeInOutCubic(progress.current), sway.current);
      const order = cells.map((_, i) => i).sort((a, b) => ((cells[b].week + 0.5) * c.sn + (cells[b].day + 0.5) * c.cs) - ((cells[a].week + 0.5) * c.sn + (cells[a].day + 0.5) * c.cs));
      return order.find(i => shapes[i]?.some(face => inPoly(face, px, py))) ?? null;
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = box.clientWidth;
      h = box.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      draw();
    };
    // ResizeObserver: re-fit whenever the card changes width (the accordion, a rotated phone).
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    engine.current = { kick, draw, hit };
    return () => { cancelAnimationFrame(frame); ro.disconnect(); engine.current = null; };
  }, [grid]);

  // Mode to morph target. Reduced motion jumps straight to the end state.
  useEffect(() => {
    target.current = mode === '3d' ? 1 : 0;
    if (reduced) { progress.current = target.current; engine.current?.draw(); }
    else engine.current?.kick();
  }, [mode, reduced]);

  // The auto play, driven by an IntersectionObserver on the stage (it reports when the stage
  // enters or leaves the screen, with no scroll listener). In view: raise the city and let it
  // sway. Out of view: lay it flat again, off screen, so the next look replays it.
  useEffect(() => {
    const box = wrap.current;
    if (!box) return;
    if (reduced) {
      // The end state, still: 3D and no sway (the mode effect above jumps instead of morphing).
      swayOn.current = false;
      if (!chosen.current) setMode('3d');
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (chosen.current) return;
      if (entry.isIntersecting) {
        swayOn.current = true;
        setMode('3d');
        engine.current?.kick();
      } else {
        swayOn.current = false;
        target.current = 0;
        progress.current = 0;
        sway.current = 0;
        setMode('2d');
        engine.current?.draw();
      }
    }, { threshold: 0.5 });
    io.observe(box);
    return () => io.disconnect();
  }, [reduced]);

  // A press on the toggle is the visitor's choice: it ends the auto play and the sway eases out.
  const choose = (next: '2d' | '3d') => {
    chosen.current = true;
    swayOn.current = false;
    setMode(next);
    engine.current?.kick();
  };

  useEffect(() => {
    activeRef.current = active;
    engine.current?.draw();
  }, [active]);


  const fromPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    setActive(engine.current?.hit(event.clientX - r.left, event.clientY - r.top) ?? null);
  };

  const onKey = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const move = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const from = active ?? points.length - 1;
    const next = active === null ? from : Math.min(points.length - 1, Math.max(0, from + move));
    setActive(next);
    setSaid(labels.day(points[next].y, unit, fmtLong(points[next].x)));
  };

  const shown = active !== null ? points[active] : null;
  const first = points[0]?.x ?? '';
  const lastDay = points[points.length - 1]?.x ?? '';

  return (
    <div className="impact-chart impact-chart-days skyline">
      <div className="skyline-stage" ref={wrap}>
        <canvas
          ref={canvas}
          className="skyline-canvas"
          role="img"
          tabIndex={0}
          aria-label={labels.label(grid.total, unit, fmtLong(first), fmtLong(lastDay))}
          onPointerMove={fromPointer}
          onPointerDown={fromPointer}
          onPointerLeave={e => { if (e.pointerType === 'mouse') setActive(null); }}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        />
        <div className="impact-tip skyline-tip" ref={tip} aria-hidden="true" hidden={!shown}>
          {shown && <>
            <span className="impact-tip-x">{fmtDate(shown.x)}</span>
            <span>{shown.y.toLocaleString('en-US')} {unit}</span>
          </>}
        </div>
      </div>
      <div className="skyline-bar">
        <p className="skyline-legend" aria-hidden="true">
          {labels.less}
          {[0, 1, 2, 3, 4].map(l => <span key={l} className="skyline-key" data-l={l} />)}
          {labels.more}
        </p>
        <div className="skyline-toggle" role="group" aria-label={labels.view} data-mode={mode}>
          <span className="skyline-thumb" aria-hidden="true" />
          <button type="button" aria-pressed={mode === '2d'} onClick={() => choose('2d')}>{labels.flat}</button>
          <button type="button" aria-pressed={mode === '3d'} onClick={() => choose('3d')}>{labels.city}</button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{said}</p>
    </div>
  );
}
