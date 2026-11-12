'use client';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import './contribution-skyline.css';

// The contribution skyline, as a scrub strip (variant B, 2026-11-11). A slim, flat day-by-day heat
// map (columns are weeks, rows are weekdays) that stays calm until it is touched: there is no auto
// play, no camera and no 2D / 3D switch any more. Moving the pointer across it (or dragging a
// finger sideways) raises the weeks near the pointer into bars, a wave that follows the pointer and
// settles back behind it. The header line reads out the week under the pointer and goes back to
// the overall total when the pointer leaves. A click, a tap or Enter pins a week raised; the same
// again, or Escape, lets it go. Arrow keys still walk the days, and the focused day's week rises
// the same way. Reduced motion: nothing rises; the week is outlined, flat.
//
// The bars rise straight up the screen and show their front face (a plain elevated front view),
// so a column never leans over its neighbour and a day's place in the grid never moves sideways.
//
// Drawing is plain canvas 2D. Everything that changes every frame (each week's lift, the pointer's
// place) lives in refs, not state, so React does not re-render sixty times a second; state holds
// only what the DOM shows (the week read out, the active day, the pinned week). The loop stops
// itself once every week has reached its target.

type Day = { x: string; y: number };
type Labels = {
  day: (n: number, unit: string, date: string) => string;
  label: (total: number, unit: string, first: string, last: string) => string;
  week: (date: string, n: number, unit: string) => string;
  total: (n: number, unit: string, weeks: number) => string;
  pinned: (week: string) => string;
  released: string;
};
// headroom: px above the grid for the bars to rise into. The popup's larger strip passes more.
type Props = { points: Day[]; unit: string; reduced: boolean; labels: Labels; title?: string; headroom?: number; pinnable?: boolean };

const FOOT = 14; // px under the grid for the month names
const REACH = 1.05; // the bump's width, in cells (the bell's sigma), across weeks and down days
const RISE = 16; // how fast a week rises toward the pointer, per second
const FALL = 5; // how fast it settles back behind it, per second
const TAP_PX = 6; // a press that moves less than this is a tap (it pins), more is a scrub
const utc = (x: string) => new Date(`${x}T00:00:00Z`);
const fmtDate = (x: string) => utc(x).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const fmtShort = (x: string) => utc(x).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const fmtLong = (x: string) => utc(x).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const hexRgb = (hex: string) => {
  const h = hex.trim().replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
};
const shade = (rgb: number[], k: number) => `rgb(${rgb.map(v => Math.round(v * k)).join(',')})`;

type Engine = { kick: () => void; at: (x: number, y: number) => { pos: number; row: number; week: number; day: number | null } };

export default function ContributionSkyline({ points, unit, reduced, labels, title, headroom: HEADROOM = 22, pinnable = true }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [week, setWeek] = useState<number | null>(null); // the week under the pointer
  const [active, setActive] = useState<number | null>(null); // the day under the pointer or the keys
  const [pinned, setPinned] = useState<number | null>(null);
  const [said, setSaid] = useState('');
  // Refs the draw loop reads, so the engine effect is set up once and never torn down on a hover.
  const ptr = useRef<number | null>(null); // the pointer's place along the strip, in weeks
  const ptrDay = useRef(3.5); // and down it, in days
  const activeRef = useRef<number | null>(null);
  const pinnedRef = useRef<number | null>(null);
  const reducedRef = useRef(reduced);
  const down = useRef<{ x: number; y: number } | null>(null);
  const engine = useRef<Engine | null>(null);

  // useMemo: the grid layout and colour levels are derived once per data set, not per render.
  const grid = useMemo(() => {
    const max = Math.max(1, ...points.map(p => p.y));
    const nonZero = points.map(p => p.y).filter(y => y > 0).sort((a, b) => a - b);
    const busy = nonZero.length ? nonZero[Math.min(nonZero.length - 1, Math.floor(nonZero.length * 0.95))] : 1;
    const cells = points.map((p, i) => ({
      week: Math.floor(i / 7),
      day: i % 7,
      level: p.y === 0 ? 0 : 1 + Math.min(3, Math.floor((p.y / busy) * 4)),
      // How far the day rises, 0 to 1 of the headroom. Empty days lift as thin slabs.
      h: p.y > 0 ? 0.2 + (p.y / max) ** 0.8 * 0.8 : 0.1,
    }));
    const weeks = Math.ceil(points.length / 7);
    // A month name under the first column whose first day falls in a new month. A month that gets
    // fewer than two columns before the next one starts is left unnamed, so names never collide.
    const starts: { week: number; name: string }[] = [];
    for (let w = 0; w < weeks; w++) {
      const d = utc(points[w * 7].x);
      if (w === 0 || d.getUTCMonth() !== utc(points[(w - 1) * 7].x).getUTCMonth()) {
        starts.push({ week: w, name: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) });
      }
    }
    const months = starts.filter((m, i) => (starts[i + 1]?.week ?? weeks) - m.week >= 2);
    const totals = Array.from({ length: weeks }, (_, w) => points.slice(w * 7, w * 7 + 7).reduce((n, p) => n + p.y, 0));
    const total = points.reduce((n, p) => n + p.y, 0);
    return { cells, weeks, months, totals, total };
  }, [points]);

  // The engine: canvas sizing, the wave loop, drawing and hit testing. Set up once per data set.
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
    const font = `500 10px ${css.fontFamily}`;
    const { cells, weeks, months } = grid;
    // Each day's rise this frame, 0 to 1. Per day, not per week (Andrew 2026-11-11: "don't make the
    // entire commit shift with my hover, just make them rise"): the grid stays where it is and only
    // the days round the pointer stand up. A pinned week still stands whole.
    const lift = new Array<number>(cells.length).fill(0);
    let w = 0;
    let h = 0;
    let gx = 0; // the grid's left edge
    let pitch = 1; // one week's width
    let row = 1; // one day's height
    let frame = 0;
    let last = 0;

    const rr = (x: number, y: number, bw: number, bh: number, r: number) => {
      const q = Math.max(0, Math.min(r, bw / 2, bh / 2));
      ctx.beginPath();
      ctx.moveTo(x + q, y);
      ctx.arcTo(x + bw, y, x + bw, y + bh, q);
      ctx.arcTo(x + bw, y + bh, x, y + bh, q);
      ctx.arcTo(x, y + bh, x, y, q);
      ctx.arcTo(x, y, x + bw, y, q);
      ctx.closePath();
    };

    /** Where the bump is centred, in weeks and days: the pointer, else the day the keys are on. */
    const centre = () => {
      if (ptr.current !== null) return { w: ptr.current, d: ptrDay.current };
      const a = activeRef.current;
      return a === null ? null : { w: Math.floor(a / 7) + 0.5, d: (a % 7) + 0.5 };
    };
    const goal = (i: number, c: { w: number; d: number } | null) => {
      if (reducedRef.current) return 0;
      const cell = cells[i];
      if (pinnedRef.current === cell.week) return 1;
      return c === null ? 0 : Math.exp(-(((cell.week + 0.5 - c.w) / REACH) ** 2 + ((cell.day + 0.5 - c.d) / REACH) ** 2));
    };

    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const gap = Math.min(3, row * 0.25);
      const cw = pitch - gap;
      const ch = row - gap;
      const radius = Math.min(3, ch * 0.3);
      const gy = HEADROOM;

      // Flat highlight (reduced motion, where nothing rises): the week is outlined instead.
      if (reducedRef.current) {
        const c = centre();
        for (const [wk, width] of [[pinnedRef.current, 2], [c === null ? null : Math.min(weeks - 1, Math.floor(c.w)), 1.5]] as const) {
          if (wk === null) continue;
          rr(gx + wk * pitch - 1, gy - 3, pitch + 2, row * 7 + 6, 5);
          ctx.strokeStyle = ink;
          ctx.lineWidth = width;
          ctx.stroke();
        }
      }

      // Top row first: a nearer (lower) row's bar paints over the rows behind it.
      for (let d = 0; d < 7; d++) {
        for (let wk = 0; wk < weeks; wk++) {
          const i = wk * 7 + d;
          const cell = cells[i];
          if (!cell) continue;
          const x = gx + wk * pitch + gap / 2;
          const y = gy + d * row + gap / 2;
          const z = lift[i] * cell.h * HEADROOM;
          const rgb = ramp[cell.level];
          if (z > 0.4) {
            // The front face: from the raised top's lower edge down to the ground.
            rr(x, y - z, cw, ch + z, radius);
            ctx.fillStyle = shade(rgb, cell.level === 0 ? 0.82 : 0.7);
            ctx.fill();
          }
          rr(x, y - z, cw, ch, radius);
          ctx.fillStyle = shade(rgb, 1);
          ctx.fill();
          // An empty day is an outlined slot (the edge is 3.24:1 on the card), so it reads apart
          // from a one-commit day by shape as well as by lightness.
          if (cell.level === 0) { ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke(); }
          if (activeRef.current === i) { ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke(); }
        }
      }

      // The pin: a short ink foot under the pinned week, so a pinned week reads apart from a hover.
      const base = gy + row * 7;
      if (pinnedRef.current !== null) {
        rr(gx + pinnedRef.current * pitch + gap / 2, base, cw, 2, 1);
        ctx.fillStyle = ink;
        ctx.fill();
      }
      ctx.font = font;
      ctx.fillStyle = muted;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      for (const m of months) ctx.fillText(m.name, gx + m.week * pitch + gap / 2, base + 4);

      // The tooltip rides its day as the week rises: placed here, by hand, every frame. Above the
      // day when it fits inside the stage, otherwise below it.
      const el = tip.current;
      const a = activeRef.current;
      if (el && a !== null && cells[a]) {
        const cell = cells[a];
        const top = gy + cell.day * row - lift[a] * cell.h * HEADROOM;
        const above = top - el.offsetHeight - 6;
        const ty = above >= 0 ? above : gy + (cell.day + 1) * row + 6;
        const half = el.offsetWidth / 2;
        const tx = gx + (cell.week + 0.5) * pitch;
        el.style.transform = `translate(${Math.round(Math.min(w - half, Math.max(half, tx)) - half)}px, ${Math.round(ty)}px)`;
      }
    };

    const step = (now: number) => {
      const dt = Math.min(64, last ? now - last : 16);
      last = now;
      let moving = false;
      const c = centre();
      for (let i = 0; i < cells.length; i++) {
        const g = goal(i, c);
        const l = lift[i];
        const next = l + (g - l) * (1 - Math.exp((-(g > l ? RISE : FALL) * dt) / 1000));
        lift[i] = Math.abs(g - next) < 0.004 ? g : next;
        if (lift[i] !== g) moving = true;
      }
      draw();
      // Draw only while moving: the loop stops itself once every week has settled.
      frame = moving ? requestAnimationFrame(step) : 0;
      if (!frame) last = 0;
    };
    const kick = () => {
      if (reducedRef.current) { lift.fill(0); draw(); return; }
      if (!frame) frame = requestAnimationFrame(step);
    };

    // Hit testing is by a day's place on the ground, not by its raised top, so the day under the
    // pointer never changes because its own bar rose. Anywhere on the strip scrubs a week.
    const at = (px: number, py: number) => {
      const pos = Math.min(weeks, Math.max(0, (px - gx) / pitch));
      const wk = Math.min(weeks - 1, Math.floor(pos));
      const d = Math.floor((py - HEADROOM) / row);
      const i = wk * 7 + d;
      return { pos, row: (py - HEADROOM) / row, week: wk, day: d >= 0 && d < 7 && i < cells.length ? i : null };
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = box.clientWidth;
      h = box.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      row = Math.max(1, (h - HEADROOM - FOOT) / 7);
      // Weeks stretch to fill the strip, up to three times a day's height, then centre.
      pitch = Math.max(1, Math.min((w - 4) / weeks, row * 3));
      gx = (w - pitch * weeks) / 2;
      draw();
    };
    // ResizeObserver: re-fit whenever the card changes width (a rotated phone).
    // The fit waits for the next frame: resizing the canvas inside the observer's own callback can
    // change the layout it is watching (a popup gaining a scrollbar), which the browser reports as
    // a "ResizeObserver loop" error.
    let fit = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(fit); fit = requestAnimationFrame(resize); });
    ro.observe(box);
    resize();

    engine.current = { kick, at };
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(fit); ro.disconnect(); engine.current = null; };
  }, [grid, HEADROOM]);

  // State to refs, then wake the loop (or redraw once, under reduced motion).
  useEffect(() => {
    activeRef.current = active;
    pinnedRef.current = pinned;
    reducedRef.current = reduced;
    engine.current?.kick();
  }, [active, pinned, reduced]);

  const weekText = (wk: number) => labels.week(fmtShort(points[wk * 7].x), grid.totals[wk], unit);

  const togglePin = (wk: number) => {
    const next = pinnedRef.current === wk ? null : wk;
    setPinned(next);
    setSaid(next === null ? labels.released : labels.pinned(weekText(next)));
  };

  const clearScrub = () => {
    ptr.current = null;
    setWeek(null);
    setActive(null);
    engine.current?.kick();
  };

  const scrub = (event: PointerEvent<HTMLCanvasElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    const spot = engine.current?.at(event.clientX - r.left, event.clientY - r.top);
    if (!spot) return null;
    ptr.current = spot.pos;
    ptrDay.current = spot.row;
    setWeek(spot.week);
    setActive(spot.day);
    engine.current?.kick();
    return spot;
  };

  const onDown = (event: PointerEvent<HTMLCanvasElement>) => {
    down.current = { x: event.clientX, y: event.clientY };
    scrub(event);
  };

  const onUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const from = down.current;
    down.current = null;
    const spot = scrub(event);
    // pinnable false (the corner card): a press belongs to the card, which opens its popup.
    if (pinnable && from && spot && Math.hypot(event.clientX - from.x, event.clientY - from.y) < TAP_PX) togglePin(spot.week);
    // A finger has no hover: lifting it ends the scrub (a pinned week stays up).
    if (event.pointerType !== 'mouse') clearScrub();
  };

  const onKey = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === 'Escape') {
      if (pinnedRef.current !== null) { event.preventDefault(); setPinned(null); setSaid(labels.released); }
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (!pinnable) return;
      event.preventDefault();
      const on = active ?? points.length - 1;
      ptr.current = null;
      setWeek(null);
      setActive(on);
      togglePin(Math.floor(on / 7));
      return;
    }
    const move = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[event.key];
    if (move === undefined) return;
    event.preventDefault();
    const from = active ?? points.length - 1;
    const next = active === null ? from : Math.min(points.length - 1, Math.max(0, from + move));
    ptr.current = null;
    setWeek(null);
    setActive(next);
    setSaid(labels.day(points[next].y, unit, fmtLong(points[next].x)));
  };

  const shown = active !== null ? points[active] : null;
  const first = points[0]?.x ?? '';
  const lastDay = points[points.length - 1]?.x ?? '';
  // The readout follows the pointer's week, else the keys' week, else the pin, else the total.
  const readWeek = week ?? (active !== null ? Math.floor(active / 7) : pinned);

  return (
    <div className="skyline">
      <div className="skyline-head">
        {title && <h3 className="skyline-title">{title}</h3>}
        <p className="skyline-read" aria-hidden="true" data-pinned={readWeek !== null && readWeek === pinned ? '' : undefined}>
          {readWeek !== null ? weekText(readWeek) : labels.total(grid.total, unit, grid.weeks)}
        </p>
      </div>
      <div className="skyline-stage" ref={wrap}>
        <canvas
          ref={canvas}
          className="skyline-canvas"
          role="img"
          tabIndex={0}
          aria-label={labels.label(grid.total, unit, fmtLong(first), fmtLong(lastDay))}
          onPointerMove={scrub}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={() => { down.current = null; clearScrub(); }}
          onPointerLeave={e => { if (e.pointerType === 'mouse') { down.current = null; clearScrub(); } }}
          onKeyDown={onKey}
          onBlur={() => { ptr.current = null; setWeek(null); setActive(null); }}
        />
        <div className="impact-tip skyline-tip" ref={tip} aria-hidden="true" hidden={!shown}>
          {shown && <>
            <span className="impact-tip-x">{fmtDate(shown.x)}</span>
            <span>{shown.y.toLocaleString('en-US')} {unit}</span>
          </>}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{said}</p>
    </div>
  );
}
