'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
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
//   - The phone stacks all six captures and crossfades to the selected one (opacity and a small
//     rise, phones.css). Under reduced motion it swaps with no movement.
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

// Flat sticker fills from the project fan's palette (globals.css .ink-card[data-fill]): the two
// site pages on paper, the game screens alternating apricot and berry-soft.
const fills = (shots: readonly PhoneShot[]) => {
  let game = 0;
  return shots.map(s => (s.where === 'Site' ? 'paper' : game++ % 2 ? 'berry-soft' : 'apricot'));
};

type Live = 'off' | 'loading' | 'ready' | 'failed';

export function PhoneStage({ shots, label, children }: { shots: readonly PhoneShot[]; label: string; children: ReactNode }) {
  const [sel, setSel] = useState(0);
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(false);
  const [live, setLive] = useState<Live>('off');
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const fill = fills(shots);
  const shot = shots[sel];
  const hover = HOVER.phones[shot.title];

  const stop = useCallback(() => setAuto(false), []);
  const pick = (n: number) => { stop(); setSel(n); };

  // In view: auto-advance runs only while at least half the stage shows.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || !inView || reduced || live !== 'off') return;
    const t = window.setInterval(() => setSel(n => (n + 1) % shots.length), ADVANCE_MS);
    return () => window.clearInterval(t);
  }, [auto, inView, reduced, live, shots.length]);

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
    pick(n);
    tabs.current[n]?.focus();
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
            <div ref={screenRef} className="ph-screen" data-live={live}>
              {/* The screenshot: opens the selected screen on the live site. */}
              <a
                className="ph-screen-link"
                href={hover.href}
                target="_blank"
                rel="noreferrer"
                data-bubble={live === 'off' ? hover.text : undefined}
                data-bubble-icon={live === 'off' ? hover.icon : undefined}
                tabIndex={live === 'off' ? 0 : -1}
                onFocus={stop}
                aria-hidden={live === 'off' ? undefined : true}
              >
                <span className="sr-only">{hover.text}</span>
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
                    data-on={n === sel}
                    loading={n === 0 ? 'eager' : 'lazy'}
                    unoptimized
                  />
                ))}
              </a>
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhoneStage;
