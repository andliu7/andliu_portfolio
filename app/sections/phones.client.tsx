'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Play, Undo2 } from 'lucide-react';
import { HOVER, PHONES, type PhoneShot } from '@/lib/site';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// The feature list and its one phone (phones.tsx; rebuild 2026-11-03, Andrew: "a feature list
// driving ONE phone" plus "Try it live"). Replaces the hand of six phones, which read as a second
// project fan.
//   - The list is a WAI-ARIA tablist: each feature is a tab, the phone is the one tabpanel.
//     Arrow keys move between tabs (roving tabindex), Home and End jump; hovering with a mouse,
//     focusing or tapping a row selects it.
//   - The phone's screen is a pager (Andrew 2026-11-11: "make the screens click and then it slides
//     into the next page horizontally"). All six captures are stacked; on any change (the list,
//     the screen, a swipe, auto-advance) the old one slides out and the new one slides in beside
//     it (phones.css, data-pos and --ph-dir: 1 pages forward, -1 back). A change mid-slide drops
//     the running slide at its end and starts the next from rest. Reduced motion: an instant swap.
//   - The screen itself is a button over the captures: a click, tap, Enter or Space goes to the
//     next screen (wrapping); a sideways swipe past SWIPE_PX, or Left and Right while it has
//     focus, pages either way. It names the next screen, and a polite line announces the new one.
//     Each screen's page on the live site, which a click here used to open, is the link under
//     the phone.
//   - Every capture is fetched once the stage is within a screen of the viewport, so both sides
//     of a slide are already loaded.
//   - Auto-advance: every ADVANCE_MS while at least half the stage is on screen, and never again
//     once the visitor hovers, focuses, taps or presses a key in it. Off under reduced motion.
//   - "Try it live" swaps the screen for Blueberry itself in an iframe, mounted only on press.
//     The page is laid out at LIVE_W css px and scaled to the screen's width (a ResizeObserver
//     publishes --ph-scale), so it renders as on a real phone. A cross-origin frame cannot report
//     a refusal (X-Frame-Options), so if load never fires within LIVE_TIMEOUT the phone says so
//     and offers a new tab. github.io frames fine today (checked 2026-11-03).

const ADVANCE_MS = 5000;
const LIVE_W = 360;
const LIVE_TIMEOUT = 15000;
const SWIPE_PX = 40;

// Flat sticker fills from the project fan's palette (globals.css .ink-card[data-fill]): the two
// site pages on paper, the game screens alternating apricot and berry-soft.
const fills = (shots: readonly PhoneShot[]) => {
  let game = 0;
  return shots.map(s => (s.where === 'Site' ? 'paper' : game++ % 2 ? 'berry-soft' : 'apricot'));
};

type Live = 'off' | 'loading' | 'ready' | 'failed';

export function PhoneStage({ shots, label, children }: { shots: readonly PhoneShot[]; label: string; children: ReactNode }) {
  // One object, so the screen showing, the one sliding out and the direction change together.
  const [page, setPage] = useState<{ sel: number; prev: number; dir: 1 | -1 }>({ sel: 0, prev: -1, dir: 1 });
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(false);
  const [warm, setWarm] = useState(false);
  const [hinted, setHinted] = useState(false);
  const [say, setSay] = useState('');
  const [live, setLive] = useState<Live>('off');
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const fill = fills(shots);
  const { sel, prev, dir } = page;
  const count = shots.length;
  const shot = shots[sel];
  const nextShot = shots[(sel + 1) % count];
  const hover = HOVER.phones[shot.title];

  const stop = useCallback(() => setAuto(false), []);
  // Every change goes through here. Without a direction, a later screen pages forward and an
  // earlier one back.
  const go = useCallback((n: number, d?: 1 | -1) => {
    setPage(p => (n === p.sel ? p : { sel: n, prev: p.sel, dir: d ?? (n > p.sel ? 1 : -1) }));
  }, []);
  const pick = (n: number, d?: 1 | -1) => { stop(); go(n, d); };
  // The screen's own paging (click, swipe, arrow keys): one step either way, wrapping.
  const step = (d: 1 | -1) => {
    const n = (sel + d + count) % count;
    pick(n, d);
    setHinted(true);
    setSay(`${PHONES.nowShowing}: ${shots[n].title}`);
  };

  // In view: auto-advance runs only while at least half the stage shows.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Warm: within a screen of the viewport, fetch and decode every capture (about 40KB each), so
  // a slide never shows an empty screen. The <Image>s also turn eager then (below).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setWarm(true);
      for (const s of shots) {
        const img = new window.Image();
        img.src = s.src;
        img.decode?.().catch(() => {});
      }
    }, { rootMargin: '100% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [shots]);

  useEffect(() => {
    if (!auto || !inView || reduced || live !== 'off') return;
    const t = window.setInterval(() => setPage(p => ({ sel: (p.sel + 1) % count, prev: p.sel, dir: 1 })), ADVANCE_MS);
    return () => window.clearInterval(t);
  }, [auto, inView, reduced, live, count]);

  // The live page's scale: the screen's width over LIVE_W.
  useEffect(() => {
    const el = screenRef.current;
    if (!el || live === 'off') return;
    const ro = new ResizeObserver(([e]) => el.style.setProperty('--ph-scale', String(e.contentRect.width / LIVE_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [live]);

  useEffect(() => {
    if (live !== 'loading') return;
    const t = window.setTimeout(() => setLive(l => (l === 'loading' ? 'failed' : l)), LIVE_TIMEOUT);
    return () => window.clearTimeout(t);
  }, [live]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = shots.length - 1;
    const next = { ArrowDown: sel + 1, ArrowRight: sel + 1, ArrowUp: sel - 1, ArrowLeft: sel - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const n = next < 0 ? last : next > last ? 0 : next;
    // An arrow pages the way it points, also across the wrap; Home and End go by position.
    pick(n, e.key === 'Home' || e.key === 'End' ? undefined : next > sel ? 1 : -1);
    tabs.current[n]?.focus();
  };

  // The screen: a sideways swipe past SWIPE_PX pages (left for next, right for previous), and
  // the click that may follow it is swallowed. Vertical moves stay the page's scroll
  // (touch-action: pan-y in phones.css), which cancels the pointer.
  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    swiped.current = false;
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    const from = drag.current;
    drag.current = null;
    if (!from) return;
    const dx = e.clientX - from.x;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(e.clientY - from.y)) return;
    swiped.current = true;
    step(dx < 0 ? 1 : -1);
  };
  const onScreenClick = () => {
    if (swiped.current) { swiped.current = false; return; }
    step(1);
  };
  const onScreenKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    step(e.key === 'ArrowRight' ? 1 : -1);
  };

  return (
    <div ref={stageRef} className="ph-stage">
      {children}
      <div className="ph-list ink-card" role="tablist" aria-label={label} aria-orientation="vertical">
        {shots.map((s, n) => (
          <button
            key={s.src}
            ref={el => { tabs.current[n] = el; }}
            type="button"
            role="tab"
            id={`ph-tab-${n}`}
            className="ph-tab"
            aria-selected={n === sel}
            aria-controls="ph-panel"
            tabIndex={n === sel ? 0 : -1}
            onClick={() => pick(n)}
            onKeyDown={onKey}
            onFocus={() => pick(n)}
            onPointerEnter={e => { if (e.pointerType === 'mouse') pick(n); }}
          >
            <span className="ph-tab-top">
              <span className="ph-num" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>
              <span className="ph-name">{s.title}</span>
              <span className="ph-where">{s.where}</span>
            </span>
            <span className="ph-why">{s.why}</span>
          </button>
        ))}
      </div>

      <div
        className="ph-device"
        role="tabpanel"
        id="ph-panel"
        aria-labelledby={`ph-tab-${sel}`}
        onPointerEnter={e => { if (e.pointerType === 'mouse') stop(); }}
      >
        {/* Under 900px the tabs are chips with no room for the line, so it shows here. */}
        <p className="ph-why-m">{shot.why}</p>
        <div className="ph-shot">
          <div className="ph-phone ink-card" data-fill={fill[sel]}>
            <span className="ph-island" aria-hidden="true" />
            <div
              ref={screenRef}
              className="ph-screen"
              data-live={live}
              data-slid={prev >= 0 || undefined}
              style={{ '--ph-dir': dir } as CSSProperties}
            >
              {/* The captures, stacked: data-pos "on" is showing (sliding in after a change),
                  "out" is the one sliding away, the rest are hidden. */}
              {shots.map((s, n) => (
                // unoptimized: the export is static, so the WebP is served as captured (a plain img).
                <Image
                  key={s.src}
                  className="ph-img"
                  src={s.src}
                  width={s.w}
                  height={s.h}
                  alt={n === sel ? s.alt : ''}
                  aria-hidden={n === sel ? undefined : true}
                  data-pos={n === sel ? 'on' : n === prev ? 'out' : 'off'}
                  loading={n === 0 || warm ? 'eager' : 'lazy'}
                  draggable={false}
                  unoptimized
                />
              ))}
              {/* The screen as a button, over the captures: next screen on a click or tap. */}
              <button
                type="button"
                className="ph-screen-btn"
                aria-label={`${PHONES.nextScreen}: ${nextShot.title}`}
                data-bubble={live === 'off' ? `${PHONES.nextScreen}: ${nextShot.title}` : undefined}
                data-bubble-icon={live === 'off' ? 'flip' : undefined}
                disabled={live !== 'off'}
                onClick={onScreenClick}
                onKeyDown={onScreenKey}
                onPointerDown={onDown}
                onPointerUp={onUp}
                onPointerCancel={() => { drag.current = null; }}
                onFocus={stop}
              />
              {live === 'off' && !hinted && <span className="ph-tap" aria-hidden="true">{PHONES.tapHint}</span>}
              {live !== 'off' && (
                <iframe
                  className="ph-frame"
                  src={PHONES.live}
                  title={PHONES.liveTitle}
                  loading="lazy"
                  // Its own origin, so scripts plus same-origin cannot reach this page; forms and
                  // popups so signing in and outbound links still work.
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  allow="clipboard-write"
                  referrerPolicy="strict-origin-when-cross-origin"
                  style={{ '--ph-live-w': `${LIVE_W}px` } as CSSProperties}
                  onLoad={() => setLive(l => (l === 'loading' || l === 'failed' ? 'ready' : l))}
                />
              )}
              {(live === 'loading' || live === 'failed') && (
                <div className="ph-veil">
                  <output className="ph-veil-note">
                    {live === 'loading' ? <><span className="ph-dot" aria-hidden="true" />{PHONES.loadingLive}</> : PHONES.liveFailed}
                  </output>
                  {live === 'failed' && (
                    <a className="ph-veil-link" href={PHONES.live} target="_blank" rel="noreferrer">
                      {PHONES.newTab} <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="ph-live-row">
            <button
              type="button"
              className="pill pill-light ph-try"
              onClick={() => { stop(); setLive(l => (l === 'off' ? 'loading' : 'off')); }}
            >
              {live === 'off'
                ? <><Play size={16} aria-hidden="true" /> {PHONES.tryLive}</>
                : <><Undo2 size={16} aria-hidden="true" /> {PHONES.backToShots}</>}
            </button>
            {live === 'ready' && (
              <a className="ph-newtab" href={PHONES.live} target="_blank" rel="noreferrer">
                {PHONES.newTab} <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
            {/* The selected screen on the live site (the screen's own click, before it paged). */}
            {live === 'off' && (
              <a className="ph-newtab" href={hover.href} target="_blank" rel="noreferrer" onFocus={stop}>
                {hover.text} <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
          </div>
          {/* Page dots: which of the six is showing. The list is the control, so these are decoration. */}
          <div className="ph-dots" aria-hidden="true">
            {shots.map((s, n) => <span key={s.src} className="ph-pip" data-on={n === sel} />)}
          </div>
          <p className="sr-only" aria-live="polite">{say}</p>
        </div>
      </div>
    </div>
  );
}

export default PhoneStage;
