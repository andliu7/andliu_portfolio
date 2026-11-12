'use client';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Eraser, Undo2 } from 'lucide-react';
import './signature-pad.css';

// A place to sign the letter by hand (Andrew 2026-11-11: "ask them to optionally sign", with the
// 21st.dev SignaturePad pasted). Kept from it: the ink. A signature drawn as a plain line has one
// weight everywhere and blunt ends, so it reads as a graph. Here each stroke is a filled outline
// whose width follows the pen's pressure, or, for a mouse or a finger, the speed of the hand (fast
// is light, slow is heavy), and the first and last few millimetres taper to a point.
// Left out: the Type, Upload and Saved tabs, the ink colours, the consent line and the
// accept step. This is a letter, not a contract: one pad, Undo and Clear, and it is optional.
// Plain CSS and canvas, no Tailwind and no animation library.
//
// The pad reports a small PNG data URL (transparent, trimmed to the ink, at most 420px wide) each
// time a stroke ends, and null when it is empty. contact-form.tsx sends it with the letter and the
// Worker attaches it to the email (worker/contact.js).
//
// Drawing needs a pointer, so there is no keyboard way to sign; the field is optional and says so.

type Pt = { x: number; y: number; p: number }; // p: 0 to 1, pressure or its stand-in
type Stroke = Pt[];

const SIZE = 5; // the nib, in CSS px
const INK = '#12142b'; // --ink, written out because the PNG is drawn off screen
const OUT_W = 420; // the PNG's widest, in px
const num = (n: number) => Math.round(n * 100) / 100;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/** A three point moving average: enough to take the stair steps off a mouse. */
function smooth(points: Pt[]): Pt[] {
  if (points.length < 3) return points;
  const out: Pt[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    out.push({ x: (a.x + b.x * 2 + c.x) / 4, y: (a.y + b.y * 2 + c.y) / 4, p: (a.p + b.p * 2 + c.p) / 4 });
  }
  out.push(points[points.length - 1]);
  return out;
}

/** One side of the outline, drawn through the midpoints so the joins are soft. */
function side(points: [number, number][], continued = false): string {
  const [first, ...rest] = points;
  let d = `${continued ? 'L' : 'M'} ${num(first[0])} ${num(first[1])}`;
  for (let i = 0; i < rest.length - 1; i++) {
    const [x, y] = rest[i], [nx, ny] = rest[i + 1];
    d += ` Q ${num(x)} ${num(y)} ${num((x + nx) / 2)} ${num((y + ny) / 2)}`;
  }
  const last = rest[rest.length - 1];
  if (last) d += ` L ${num(last[0])} ${num(last[1])}`;
  return d;
}

/** The outline of one stroke as an SVG path: a radius at every point, offset to both sides. */
function strokePath(stroke: Stroke): string {
  const pts = smooth(stroke);
  const base = SIZE / 2;
  if (pts.length === 1) {
    const { x, y, p } = pts[0];
    const r = num(base * (0.4 + 0.6 * p));
    return `M ${num(x - r)} ${num(y)} a ${r} ${r} 0 1 0 ${num(r * 2)} 0 a ${r} ${r} 0 1 0 ${num(-r * 2)} 0 Z`;
  }
  const len: number[] = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = len[len.length - 1];
  // taper over a few nib widths, never more than half the stroke, or a short flick would vanish
  const taper = Math.min(SIZE * 3.5, total / 2);
  const left: [number, number][] = [], right: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next.x - prev.x, dy = next.y - prev.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const fromStart = taper > 0 ? Math.min(1, len[i] / taper) : 1;
    const fromEnd = taper > 0 ? Math.min(1, (total - len[i]) / taper) : 1;
    const r = base * (0.32 + 0.68 * pts[i].p) * easeOut(Math.min(fromStart, fromEnd));
    left.push([pts[i].x - dy * r, pts[i].y + dx * r]);
    right.push([pts[i].x + dy * r, pts[i].y - dx * r]);
  }
  return `${side(left)} ${side(right.reverse(), true)} Z`;
}

/** The ink as a trimmed, transparent PNG, scaled down to OUT_W if it is wider. */
function toPng(strokes: Stroke[]): string | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const pt of s) { x0 = Math.min(x0, pt.x); y0 = Math.min(y0, pt.y); x1 = Math.max(x1, pt.x); y1 = Math.max(y1, pt.y); }
  if (!Number.isFinite(x0)) return null;
  const pad = 8, w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
  const scale = Math.min(1.5, OUT_W / w);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w * scale));
  canvas.height = Math.max(1, Math.ceil(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.translate(pad - x0, pad - y0);
  ctx.fillStyle = INK;
  for (const s of strokes) ctx.fill(new Path2D(strokePath(s)));
  return canvas.toDataURL('image/png');
}

type Labels = { label: string; hint: string; area: string; undo: string; clear: string; signed: string };

export function SignaturePad({ onChange, disabled = false, labels, resetKey = 0 }: {
  /** The PNG data URL after each stroke, or null once the pad is empty. */
  onChange: (png: string | null) => void;
  disabled?: boolean;
  labels: Labels;
  /** Change this to wipe the pad from outside (after a send). */
  resetKey?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef<Stroke | null>(null);
  const last = useRef<{ x: number; y: number; t: number; p: number } | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawing, setDrawing] = useState(false);
  const report = useRef(onChange);
  useEffect(() => { report.current = onChange; }, [onChange]);

  // Paints every finished stroke and the one in progress. The canvas is sized in device pixels and
  // scaled back, so the ink is sharp on a dense screen.
  const paint = useCallback(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.fillStyle = INK;
    for (const s of live.current ? [...strokes, live.current] : strokes) ctx.fill(new Path2D(strokePath(s)));
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const box = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
      paint();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [paint]);

  // Tell the form whenever the finished strokes change.
  useEffect(() => { report.current(strokes.length ? toPng(strokes) : null); }, [strokes]);
  // Wiped from outside: a sent letter starts the next one unsigned.
  useEffect(() => { setStrokes([]); }, [resetKey]);

  const point = (e: PointerEvent<HTMLCanvasElement>): Pt => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left, y = e.clientY - box.top, now = performance.now(), prev = last.current;
    // A pen reports pressure. A mouse reports 0.5 for every point, so speed stands in for it, eased
    // toward its target so one jittery sample does not put a blob in the middle of a line.
    let p = 0.65;
    if (e.pointerType === 'pen' && e.pressure > 0 && e.pressure !== 0.5) p = e.pressure;
    else if (prev) {
      const speed = Math.hypot(x - prev.x, y - prev.y) / Math.max(1, now - prev.t); // px per ms
      p = prev.p + (Math.max(0.28, Math.min(1, 1 - speed / 2.4)) - prev.p) * 0.45;
    }
    last.current = { x, y, t: now, p };
    return { x, y, p };
  };
  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (disabled || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = null;
    live.current = [point(e)];
    setDrawing(true);
    paint();
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const stroke = live.current;
    if (!stroke) return;
    const pt = point(e), prev = stroke[stroke.length - 1];
    if (Math.hypot(pt.x - prev.x, pt.y - prev.y) < 1.1) return; // barely moved: cost and jitter, not shape
    stroke.push(pt);
    paint();
  };
  const end = () => {
    const stroke = live.current;
    live.current = null;
    last.current = null;
    setDrawing(false);
    if (stroke?.length) setStrokes(s => [...s, stroke]);
  };

  const empty = strokes.length === 0 && !drawing;
  return (
    <div className="sig" data-disabled={disabled ? '' : undefined}>
      <div className="sig-head">
        <span className="cf-label" id="sig-label">{labels.label}</span>
        <div className="sig-tools">
          <button type="button" className="sig-tool" onClick={() => setStrokes(s => s.slice(0, -1))} disabled={disabled || !strokes.length}><Undo2 size={15} aria-hidden="true" />{labels.undo}</button>
          <button type="button" className="sig-tool" onClick={() => setStrokes([])} disabled={disabled || !strokes.length}><Eraser size={15} aria-hidden="true" />{labels.clear}</button>
        </div>
      </div>
      <div className="sig-board">
        {/* touch-action none: a finger on the pad signs and does not scroll the page */}
        <canvas
          ref={canvasRef} className="sig-canvas" data-own-cursor="" role="img" aria-label={strokes.length ? labels.signed : labels.area}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={end} onPointerCancel={end}
        />
        <div className="sig-rule" aria-hidden="true"><span>×</span></div>
        {empty && <p className="sig-hint" aria-hidden="true">{labels.hint}</p>}
      </div>
    </div>
  );
}

export default SignaturePad;
