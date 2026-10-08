'use client';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowUpRight, Minus, RotateCcw } from 'lucide-react';
import { APPROVALS, FLOAT_TABS, MICROCOPY, PROJECTS, type ImageKey } from '@/lib/site';
import { PROJECT_ART } from './art';
import { Shot } from './shot';
import './floating-tabs.css';

// The projects as floating windows on a desk (Andrew 2026-10-07): the other view of the
// Projects section, beside the fan carousel. Projects 02 onward; 01 (Blueberry) has its own
// chapter and 07 (the island) is the finale, so both stay out, as in the spreads.
//
// Each window: a title bar (number, name, minimize, put back) tinted with the project's colour,
// which is also its thin border; under the bar a pane that flips in 3D. Front: the picture.
// Back: the colourful text side (number, lines, tag chips, live and source buttons).
//   - drag by the title bar, resize from the bottom-right corner (the picture keeps 16:10)
//   - click the pane (or Enter on the focused window) to flip it; arrows move, Shift+arrows resize
//   - a flipped window grows to fit its text side (wider too, if the desk is short) and turns square
//   - minimize sends it to the dock along the desk's bottom; its chip opens it again
//   - "Tidy up" lays the open windows out in a grid
// Under 700px the windows stack in a column: no dragging or resizing, flip and minimize still work.
// Reduced motion is CSS only (floating-tabs.css): the faces swap with no turn, nothing glides.
//
// Positions are fractions of the room left in the desk (0 = left or top edge, 1 = right or
// bottom edge), so a window can never leave the desk, even when the browser is resized, and
// the server can render the scatter with plain CSS before anything is measured.

type Project = (typeof PROJECTS)[number];
type Win = { id: string; fx: number; fy: number; w: number; rot: number; z: number; flipped: boolean; min: boolean };

const SHOWN = PROJECTS.filter(p => p.id !== 'blueberry' && p.id !== 'island');

/** One sticker fill per project, the same ones the spreads use (ink text is AA on each). */
export const PROJECT_FILL: Record<string, string> = { flashcards: 'tile-gold', brain: 'tile-pink', trainer: 'tile-leaf', studio: 'tile-apricot', guide: 'tile-teal' };

const BAR = 48; // title bar height in px (CSS: --fw-bar)
const MIN_W = 260;
const MAX_W = 640;
const STEP = 16; // arrow key move, px
const RATIO = 10 / 16; // the pictures are 16:10
const FRAME = 5; // the window's 2.5px border, top and bottom or left and right (CSS: .fw-win border)
/** A window's height at width w: the bar plus the 16:10 picture, or the text side if that is taller. */
const heightOf = (w: number, back = 0) => BAR + FRAME + Math.max((w - FRAME) * RATIO, back);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const PAD = 14; // room the first scatter keeps from the desk's edges, for the turn and the ledge shadow

// The first scatter: three windows along the top, two along the bottom, slightly turned, none
// covering another. fx is where in its row a window sits (0 left, 1 right); fitScatter turns it
// into a place on the actual desk and shrinks every window by the same amount if the desk is small.
const SCATTER: Record<string, { fx: number; row: 0 | 1; w: number; rot: number }> = {
  flashcards: { fx: 0, row: 0, w: 380, rot: -2 },
  brain: { fx: 0.5, row: 0, w: 400, rot: 1.5 },
  trainer: { fx: 1, row: 0, w: 380, rot: -1.5 },
  studio: { fx: 0.2, row: 1, w: 440, rot: 1.5 },
  guide: { fx: 0.8, row: 1, w: 400, rot: -2 },
};
/** The scatter on a desk of W by H px (W = 0 before the desk is measured: the listed sizes). */
function fitScatter(W: number, H: number) {
  const all = Object.values(SCATTER);
  const widest = (row: 0 | 1) => Math.max(...all.filter(s => s.row === row).map(s => s.w));
  const s = W ? Math.min(1,
    (H - 2 * (BAR + FRAME) - 3 * PAD) / (RATIO * (widest(0) + widest(1) - 2 * FRAME)),
    (W - 4 * PAD) / all.filter(s => s.row === 0).reduce((a, s) => a + s.w, 0)) : 1;
  const out: Record<string, Pick<Win, 'fx' | 'fy' | 'w' | 'rot'>> = {};
  for (const [id, { fx, row, w: w0, rot }] of Object.entries(SCATTER)) {
    const w = Math.max(MIN_W, Math.round(w0 * s));
    const h = heightOf(w);
    out[id] = W ? {
      w, rot,
      fx: W > w ? clamp((PAD + fx * (W - 2 * PAD - w)) / (W - w), 0, 1) : 0,
      fy: H > h ? clamp((row ? H - PAD - h : PAD) / (H - h), 0, 1) : 0,
    } : { w, rot, fx, fy: row };
  }
  return out;
}
const start = (): Win[] => {
  const spots = fitScatter(0, 0);
  return SHOWN.map((p, i) => ({ id: p.id, ...(spots[p.id] ?? { fx: 0.5, fy: 0.5, w: 400, rot: 0 }), z: i + 1, flipped: false, min: false }));
};

const isPhone = () => window.matchMedia('(max-width: 699px)').matches;

/** The screenshot to show: the project's own, or Second Brain's once Andrew approves it (as projects.tsx). */
function imageOf(p: Project): ImageKey | null {
  if (p.image) return p.image;
  return APPROVALS.secondBrainShot && p.imageApproved ? p.imageApproved : null;
}

function Media({ project }: { project: Project }) {
  const image = imageOf(project);
  if (image) return <Shot image={image} sizes="(min-width: 700px) 640px, 92vw" />;
  const Art = PROJECT_ART[project.id];
  // compact: the animation pipeline's small tiles-and-arrows version fits a window; the drawings ignore it.
  return Art ? <Art compact /> : null;
}

/** The hand-drawn "click to flip" sticker with its curved arrow. Decoration: the window's own
 * keyboard help says the same thing to screen readers. */
function FlipHint() {
  return (
    <span className="fw-hint" aria-hidden="true">
      <span className="fw-hint-tag">{FLOAT_TABS.flip}</span>
      {/* Drawn twice, a wide ink stroke under a thin apricot one, so it reads on dark and light pictures. */}
      <svg className="fw-hint-arrow" viewBox="0 0 52 46">
        <g className="fw-hint-under"><path d="M6 10C20 2 40 6 44 22C46 30 42 36 36 38" /><path d="M44 31 36 38 43 44" /></g>
        <g className="fw-hint-over"><path d="M6 10C20 2 40 6 44 22C46 30 42 36 36 38" /><path d="M44 31 36 38 43 44" /></g>
      </svg>
    </span>
  );
}

function Back({ project, flipped }: { project: Project; flipped: boolean }) {
  return (
    <div className="fw-face fw-back" data-fill={PROJECT_FILL[project.id]} data-ground="paper">
      {/* The text at its natural height, measured by FloatingTabs; the face around it is clipped to the window. */}
      <div className="fw-back-in" data-id={project.id}>
        <span className="fw-num" aria-hidden="true">{project.num}</span>
        <span className="fw-kind">{project.kind}{project.year ? ` / ${project.year}` : ''}</span>
        {project.lines.map(line => <p key={line} className="fw-line">{line}</p>)}
        <ul className="fw-tags">
          {project.tags.map(tag => <li key={tag} className="fw-tag">{tag}</li>)}
        </ul>
        {project.links.length > 0 && (
          <div className="row-actions fw-actions">
            {project.links.map(link => (
              <a
                key={link.href}
                className={link.kind === 'live' ? 'pill pill-berry press' : 'pill pill-light'}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                // Hidden behind the picture until the window is flipped, so Tab skips it until then.
                tabIndex={flipped ? undefined : -1}
              >
                {link.kind === 'live' ? MICROCOPY.seeLive : MICROCOPY.source} <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FloatingTabs() {
  const [wins, setWins] = useState<Win[]>(start);
  const [dragging, setDragging] = useState<string | null>(null);
  // Each text side's natural height and the width it was measured at, kept current by the
  // ResizeObserver below. A flipped window is that tall, so the edge clamps and Tidy up use it.
  const [backs, setBacks] = useState<Record<string, { h: number; w: number }>>({});
  const areaRef = useRef<HTMLDivElement>(null);
  // What the pointer grabbed and where everything was at that moment. A ref, not state: it changes
  // on every pointer move and nothing renders from it.
  const grab = useRef<{ id: string; kind: 'move' | 'size'; px: number; py: number; left: number; top: number; w: number; h: number; W: number; H: number } | null>(null);
  // An id to focus after the next render (a window after it is opened, a dock chip after minimize).
  const focusNext = useRef<string | null>(null);

  // useEffect with no dependency list runs after every render: by then the element to focus exists.
  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });

  // The windows render only once the desk is measured, so they appear already fitted to it
  // instead of gliding there from the listed sizes. useLayoutEffect runs before the first paint.
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const area = areaRef.current!.getBoundingClientRect();
    if (!isPhone()) {
      const spots = fitScatter(area.width, area.height);
      setWins(ws => ws.map(w => ({ ...w, ...spots[w.id] })));
    }
    setReady(true);
  }, []);

  // Re-run when windows open or close, so a window back from the dock is observed again.
  const openKey = wins.filter(w => !w.min).map(w => w.id).join();
  useEffect(() => {
    const ro = new ResizeObserver(entries => setBacks(prev => {
      let next = prev;
      for (const e of entries) {
        const el = e.target as HTMLElement;
        const id = el.dataset.id!;
        // The inner text box is never clipped, so its height is the text side's natural height.
        const m = { h: el.offsetHeight, w: el.offsetWidth };
        if (prev[id]?.h !== m.h || prev[id]?.w !== m.w) next = { ...next, [id]: m };
      }
      return next;
    }));
    areaRef.current?.querySelectorAll<HTMLElement>('.fw-back-in').forEach(el => ro.observe(el));
    return () => ro.disconnect();
  }, [openKey, ready]);
  /** The window's height now: the text side counts only while it is the side showing. */
  const tall = (win: Win, w: number) => heightOf(w, win.flipped ? backs[win.id]?.h ?? 0 : 0);

  // The pixel tops Tidy up chose, kept until a window is moved. Tidy can only estimate a text
  // side's height at the new width, so once the real heights are measured this re-pins each row.
  const tidied = useRef<Map<string, number> | null>(null);
  useEffect(() => {
    const tops = tidied.current;
    const H = areaRef.current?.getBoundingClientRect().height;
    if (!tops || !H) return;
    setWins(ws => ws.map(win => {
      const top = tops.get(win.id);
      if (top === undefined) return win;
      const roomY = H - tall(win, win.w);
      const fy = roomY > 0 ? clamp(top / roomY, 0, 1) : 0;
      return Math.abs(fy - win.fy) < 0.001 ? win : { ...win, fy };
    }));
  }, [backs]); // only on new measurements: tall() inside reads those same backs

  const patch = (id: string, next: Partial<Win>) => setWins(ws => ws.map(w => (w.id === id ? { ...w, ...next } : w)));
  const raise = (id: string) => setWins(ws => {
    const top = Math.max(...ws.map(w => w.z));
    return ws.find(w => w.id === id)?.z === top ? ws : ws.map(w => (w.id === id ? { ...w, z: top + 1 } : w));
  });

  /** The desk's free room and a window's pixel box, for turning fractions into pixels and back. */
  const measure = (win: Win) => {
    const area = areaRef.current!.getBoundingClientRect();
    const w = Math.min(win.w, area.width);
    const roomX = Math.max(0, area.width - w);
    const h = tall(win, w);
    const roomY = Math.max(0, area.height - h);
    return { W: area.width, H: area.height, w, h, left: win.fx * roomX, top: win.fy * roomY };
  };
  /** Pixels back to fractions; anything past an edge is pulled back onto the desk. */
  const place = (left: number, top: number, w: number, h: number, W: number, H: number) => {
    const roomX = W - w;
    const roomY = H - h;
    return { fx: roomX > 0 ? clamp(left / roomX, 0, 1) : 0, fy: roomY > 0 ? clamp(top / roomY, 0, 1) : 0 };
  };

  const onGrab = (e: ReactPointerEvent, win: Win, kind: 'move' | 'size') => {
    if (e.button !== 0 || isPhone() || (e.target as Element).closest('button')) return;
    e.preventDefault();
    // Pointer capture: every later move and the release come to this element, even off the desk.
    e.currentTarget.setPointerCapture(e.pointerId);
    tidied.current = null;
    grab.current = { id: win.id, kind, px: e.clientX, py: e.clientY, ...measure(win) };
    setDragging(win.id);
    raise(win.id);
  };
  const onDrag = (e: ReactPointerEvent) => {
    const g = grab.current;
    if (!g) return;
    const dx = e.clientX - g.px;
    const dy = e.clientY - g.py;
    if (g.kind === 'move') {
      patch(g.id, place(g.left + dx, g.top + dy, g.w, g.h, g.W, g.H));
    } else {
      // The left and top edges stay put; the width stops at the desk's right and bottom edges.
      const fitH = (g.H - g.top - BAR - FRAME) / RATIO + FRAME;
      const w = clamp(g.w + dx, MIN_W, Math.min(MAX_W, g.W - g.left, fitH));
      patch(g.id, { w, ...place(g.left, g.top, w, heightOf(w), g.W, g.H) });
    }
  };
  const onDrop = () => { grab.current = null; setDragging(null); };

  const onKey = (e: KeyboardEvent, win: Win) => {
    if (e.target !== e.currentTarget) return; // keys inside a button or link are theirs
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      flip(win);
      return;
    }
    const arrow = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!arrow || isPhone()) return;
    e.preventDefault();
    tidied.current = null;
    const m = measure(win);
    if (e.shiftKey) {
      const w = clamp(m.w + (arrow[0] - arrow[1]) * STEP * 2, MIN_W, Math.min(MAX_W, m.W - m.left, (m.H - m.top - BAR - FRAME) / RATIO + FRAME));
      patch(win.id, { w, ...place(m.left, m.top, w, heightOf(w), m.W, m.H) });
    } else {
      patch(win.id, place(m.left + arrow[0] * STEP, m.top + arrow[1] * STEP, m.w, m.h, m.W, m.H));
    }
  };

  /** Turn a window over. A text side taller than the desk widens the window (its text rewraps
   * shorter) until it fits or the window is as wide as it may be. The text is measured at each
   * width tried, in the same frame, so nothing is drawn at the trial widths. */
  const flip = (win: Win) => {
    const text = document.querySelector<HTMLElement>(`#fw-win-${win.id} .fw-back-in`);
    if (win.flipped || !text || isPhone()) return patch(win.id, { flipped: !win.flipped });
    const area = areaRef.current!.getBoundingClientRect();
    const most = Math.min(MAX_W, area.width);
    const textAt = (w: number) => { text.style.width = `${w - FRAME}px`; return text.offsetHeight; };
    let w = Math.min(win.w, area.width);
    while (w < most && heightOf(w, textAt(w)) > area.height) w = Math.min(most, w + 8);
    text.style.width = '';
    patch(win.id, { flipped: true, w });
  };
  const minimize = (id: string) => { patch(id, { min: true }); focusNext.current = `fw-chip-${id}`; };
  const open = (id: string) => {
    setWins(ws => ws.map(w => (w.id === id ? { ...w, min: false, z: Math.max(...ws.map(o => o.z)) + 1 } : w)));
    focusNext.current = `fw-win-${id}`;
  };
  const reset = (id: string) => {
    tidied.current = null;
    const area = areaRef.current!.getBoundingClientRect();
    patch(id, { ...fitScatter(area.width, area.height)[id], flipped: false });
  };

  /** The open windows in a grid, centred on the desk, every window the same width, no turn.
   * A flipped window counts at its text side's height, which grows as the window narrows. The
   * column count is the one that gives the biggest windows that still fit. If the text sides
   * cannot fit at any size, every window turns back to its picture and the pictures are laid out;
   * if even those cannot fit, the windows cascade so every title bar stays in reach. A row never
   * sits on top of the one above it. */
  const tidy = () => {
    const area = areaRef.current!.getBoundingClientRect();
    const openWins = wins.filter(w => !w.min);
    if (!openWins.length) return;
    const gap = 16;
    // Text keeps about the same area as it rewraps, so its height scales with measured width / new width.
    const hOf = (win: Win, w: number, flips: boolean) => {
      const b = backs[win.id];
      return heightOf(w, flips && win.flipped && b ? b.h * (b.w / (w - 5)) : 0);
    };
    const rowsOf = (cols: number, w: number, flips: boolean) => {
      const rows: number[] = [];
      openWins.forEach((win, i) => { const r = Math.floor(i / cols); rows[r] = Math.max(rows[r] ?? 0, hOf(win, w, flips)); });
      return rows;
    };
    const total = (rows: number[]) => rows.reduce((a, h) => a + h, 0) + (rows.length - 1) * gap;
    // For a column count, the widest window (in 8px steps) whose rows fit the desk's height, or 0.
    const widthFor = (cols: number, flips: boolean) => {
      for (let w = Math.min(MAX_W, (area.width - gap * (cols + 1)) / cols); w >= MIN_W; w -= 8) if (total(rowsOf(cols, w, flips)) + 2 * gap <= area.height) return w;
      return 0;
    };
    const best = (flips: boolean) => {
      let cols = 1;
      for (let c = 2; c <= openWins.length; c++) if (widthFor(c, flips) > widthFor(cols, flips)) cols = c;
      return { cols, w: widthFor(cols, flips) };
    };
    tidied.current = new Map();
    let { cols, w } = best(true);
    const flips = w > 0;
    if (!flips) ({ cols, w } = best(false));
    if (!w) {
      // A very short desk: a cascade, each window one title bar lower and further right than the
      // last and drawn above it, as big as the desk allows, all on their picture side.
      const n = openWins.length;
      const cw = clamp((area.height - 2 * gap - n * BAR - FRAME) / RATIO + FRAME, MIN_W, Math.min(MAX_W, area.width - 2 * gap - (n - 1) * BAR));
      const ch = heightOf(cw);
      const x0 = Math.max(0, (area.width - cw - (n - 1) * BAR) / 2);
      const y0 = Math.max(0, (area.height - ch - (n - 1) * BAR) / 2);
      const z0 = Math.max(...wins.map(o => o.z));
      const spots = new Map(openWins.map((win, i) => {
        tidied.current!.set(win.id, y0 + i * BAR);
        return [win.id, { w: cw, rot: 0, flipped: false, z: z0 + 1 + i, ...place(x0 + i * BAR, y0 + i * BAR, cw, ch, area.width, area.height) }];
      }));
      setWins(ws => ws.map(win => ({ ...win, ...spots.get(win.id) })));
      return;
    }
    const rows = rowsOf(cols, w, flips);
    const x0 = Math.max(gap, (area.width - cols * w - (cols - 1) * gap) / 2);
    const y0 = Math.max(gap, (area.height - total(rows)) / 2);
    const tops = rows.map((_, r) => y0 + rows.slice(0, r).reduce((a, h) => a + h + gap, 0));
    const spots = new Map(openWins.map((win, i) => {
      const left = x0 + (i % cols) * (w + gap);
      const top = tops[Math.floor(i / cols)];
      tidied.current!.set(win.id, top);
      // Text sides that cannot fit turn back to their pictures in the same update as the move.
      return [win.id, { w, rot: 0, ...(flips ? {} : { flipped: false }), ...place(left, top, w, hOf(win, w, flips), area.width, area.height) }];
    }));
    setWins(ws => ws.map(win => ({ ...win, ...spots.get(win.id) })));
  };

  const minimized = wins.filter(w => w.min);

  return (
    <div className="fw" data-dragging={dragging ? '' : undefined}>
      <p className="sr-only" id="fw-keys">{FLOAT_TABS.keys}</p>
      <div className="fw-desk" role="region" aria-label={FLOAT_TABS.label}>
        <div className="fw-area" ref={areaRef}>
          {ready && wins.map(win => {
            if (win.min) return null;
            const project = SHOWN.find(p => p.id === win.id)!;
            const titleId = `fw-title-${win.id}`;
            return (
              <article
                key={win.id}
                id={`fw-win-${win.id}`}
                className="fw-win"
                data-fill={PROJECT_FILL[win.id]}
                data-flipped={win.flipped ? '' : undefined}
                data-dragging={dragging === win.id ? '' : undefined}
                tabIndex={0}
                aria-labelledby={titleId}
                aria-describedby="fw-keys"
                // CSS custom properties carry the place; the CSS uses them only on the desk layout,
                // so the phone column ignores them.
                style={{ '--fx': win.fx, '--fy': win.fy, '--w': `${win.w}px`, '--h': `${tall(win, win.w)}px`, '--back': `${backs[win.id]?.h ?? 0}px`, '--rot': `${win.rot}deg`, zIndex: win.z } as CSSProperties}
                onFocus={() => raise(win.id)}
                onPointerDown={() => raise(win.id)}
                onKeyDown={e => onKey(e, win)}
              >
                <header className="fw-titlebar" onPointerDown={e => onGrab(e, win, 'move')} onPointerMove={onDrag} onPointerUp={onDrop} onPointerCancel={onDrop}>
                  <span className="fw-titlebar-num" aria-hidden="true">{project.num}</span>
                  <h3 id={titleId} className="fw-title">{project.title}</h3>
                  <button type="button" className="fw-ctl" aria-label={FLOAT_TABS.reset(project.title)} onClick={() => reset(win.id)}>
                    <span className="fw-ctl-face"><RotateCcw size={15} strokeWidth={2.6} aria-hidden="true" /></span>
                  </button>
                  <button type="button" className="fw-ctl" aria-label={FLOAT_TABS.minimize(project.title)} onClick={() => minimize(win.id)}>
                    <span className="fw-ctl-face"><Minus size={16} strokeWidth={2.8} aria-hidden="true" /></span>
                  </button>
                </header>
                <div
                  className="fw-pane"
                  onClick={e => { if (!(e.target as Element).closest('a, button')) flip(win); }}
                >
                  <div className="fw-turn">
                    <div className="fw-face fw-front">
                      <div className="fw-media"><Media project={project} /></div>
                      <FlipHint />
                    </div>
                    <Back project={project} flipped={win.flipped} />
                  </div>
                </div>
                <span
                  className="fw-grip"
                  aria-hidden="true"
                  onPointerDown={e => onGrab(e, win, 'size')}
                  onPointerMove={onDrag}
                  onPointerUp={onDrop}
                  onPointerCancel={onDrop}
                />
              </article>
            );
          })}
        </div>
        {/* The desk's bottom row, like a dock: minimized windows on the left, Tidy up on the right,
            inside the desk so it is always in view with it (it was hidden under the sticky header). */}
        <div className="fw-foot">
          <ul className="fw-dock" aria-label={FLOAT_TABS.dock}>
            {minimized.map(win => {
              const project = SHOWN.find(p => p.id === win.id)!;
              return (
                <li key={win.id}>
                  <button id={`fw-chip-${win.id}`} type="button" className="fw-chip" data-fill={PROJECT_FILL[win.id]} aria-label={FLOAT_TABS.open(project.title)} onClick={() => open(win.id)}>
                    <span className="fw-chip-num" aria-hidden="true">{project.num}</span> {project.title}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="pill pill-light press fw-tidy" onClick={tidy}>{FLOAT_TABS.tidy}</button>
        </div>
      </div>
    </div>
  );
}
