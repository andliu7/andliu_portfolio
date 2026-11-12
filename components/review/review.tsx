'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getLenis } from '@/app/smooth';
import './review.css';

// The design review layer (2026-11-09). DEV ONLY: app/layout.tsx mounts it only when
// NODE_ENV is not production, so it can never ship by accident.
//
// Each proposal is a switch. A switch that is on puts the flag class rvf-<id> on <html> (rvf, not rv: the rail and thumb bar own .rv-rail and .rv-thumb), and every
// proposal's CSS in review.css is gated on its class, so "off" is exactly the site as committed.
// Nothing in app/sections or components/site is edited: an approved proposal gets moved into the
// section's own files afterwards, and this folder is deleted.
//
// Pattern: "feature flags as root classes". React state holds which switches are on, one effect
// mirrors that onto <html>, and CSS does the rest. Only three proposals need script (the rail's
// position, the timeline's spotlight, the résumé's landing), and each is its own small hook that
// does nothing while its switch is off.

type Proposal = { id: string; round: 1 | 2; title: string; why: string; href?: string; note?: string };

const PROPOSALS: Proposal[] = [
  { id: 'rail', round: 1, title: 'The day rail', href: '#phones', note: 'Desktop, right edge',
    why: 'The page is one day, scrolled, but nothing says so. A sun travels down a rail and turns into the moon, with a clock. Dots jump to a section; drag the sun to scrub.' },
  { id: 'hours', round: 1, title: 'Rows wear their hour', href: '#contents', note: 'Hover a row in Where to?',
    why: 'Each row takes the sky colour of the place it leads to and shows the time you will arrive, so the contents previews the trip instead of only listing it.' },
  { id: 'hero', round: 1, title: 'The name opens like doors', href: '#top', note: 'Scroll slowly out of the hero',
    why: 'Leaving the hero is a plain scroll today. Here ANDREW and LIU part, you step forward and the stickers drift out: the first scroll rewards itself.' },
  { id: 'spot', round: 1, title: 'One job in the light', href: '#experience', note: 'Scroll through Along the way',
    why: 'Three cards compete while one is being read. The card under the middle of the screen stands full size; its neighbours step back and its people hop.' },
  { id: 'land', round: 1, title: 'The résumé lands', href: '#resume', note: 'Arrive at Résumé',
    why: 'The page is the thing recruiters came for, and it is just there. Now it drops onto the desk on a spring, then "click here!" writes itself.' },
  { id: 'thumb', round: 1, title: 'Thumb bar on phones', href: '#contents', note: 'Narrow the window under 760px',
    why: 'On a phone the header has no Résumé button. A floating three-tab pill keeps Work, Résumé and Say hi under the thumb, and steps aside where it would cover something.' },
  // Round 2 (2026-11-10), from Andrew's notes on round 1.
  { id: 'page', round: 2, title: 'The page is the hero', href: '#resume', note: 'Desktop. Résumé',
    why: 'RÉSUMÉ shouted louder than the résumé. The title drops to a label, the page grows by about 40% and sits on the two-thirds line, big enough to read, running off the foot of the screen.' },
  { id: 'letter', round: 2, title: 'The letter in the middle', href: '#contact', note: 'Desktop. Contact',
    why: 'Two columns pulled the eye apart. Now one centred column: the quick way as a single row of buttons, then the letter. The plane leaves from the letter and the envelope leans on it.' },
  { id: 'island', round: 2, title: 'Closer to the island', href: '#island', note: 'Island. Lens 1.4x closer',
    why: 'The moon and the sea were winning. The camera moves in so the island fills its side of the screen and the water becomes the frame.' },
  { id: 'bubble', round: 2, title: 'Pick, read, see', href: '#phones', note: 'Desktop. Blueberry on a phone',
    why: 'Six descriptions at once read as a table. The list becomes six short rows, and the one you pick explains itself in a note beside the phone. Nothing shifts under the pointer.' },
  { id: 'quiet', round: 2, title: 'A quieter rail', note: 'Desktop. Point at the right edge',
    why: 'You said the rail feels like part of the page. At rest only the sun and the clock show; the track and its dots appear when the pointer comes near.' },
  // 2026-11-11, from Andrew's question ("full resume shown ... better on the left side? text on the right?").
  { id: 'left', round: 2, title: 'The whole résumé, on the left', href: '#resume', note: 'Desktop. Résumé',
    why: 'The page ran off the foot of the screen. Here all of it shows, on the left where the eye lands first, with the title and the two buttons beside its middle. The section grows taller than one screen to fit it.' },
];

const KEY = 'rv:v1';
type Saved = { on: Record<string, boolean>; after: boolean; open: boolean };
const DEFAULTS: Saved = { on: Object.fromEntries(PROPOSALS.map(p => [p.id, true])), after: true, open: true };

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const saved = JSON.parse(raw) as Partial<Saved>;
    return { on: { ...DEFAULTS.on, ...saved.on }, after: saved.after ?? true, open: saved.open ?? true };
  } catch { return DEFAULTS; }
}

export default function Review() {
  // null until mounted: the server cannot read localStorage, so the first client render must
  // match the server's (nothing), and the saved choices arrive one tick later.
  const [state, setState] = useState<Saved | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setState(load()));
    return () => cancelAnimationFrame(frame);
  }, []);

  const live = (id: string) => !!state && state.after && !!state.on[id];

  // Mirror the switches onto <html>, and remember them.
  useEffect(() => {
    if (!state) return;
    const root = document.documentElement;
    PROPOSALS.forEach(p => root.classList.toggle(`rvf-${p.id}`, state.after && !!state.on[p.id]));
    window.dispatchEvent(new Event('rv:flags')); // the island scene re-frames on this (island-scene.tsx Framing)
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private window: fine */ }
    return () => PROPOSALS.forEach(p => root.classList.remove(`rvf-${p.id}`));
  }, [state]);

  useSpotlight(live('spot'));
  useLanding(live('land'));

  if (!state) return null;
  const approved = PROPOSALS.filter(p => state.on[p.id]);
  const copy = async () => {
    const text = `Approved: ${approved.map(p => p.title).join('; ') || 'none'}. Rejected: ${PROPOSALS.filter(p => !state.on[p.id]).map(p => p.title).join('; ') || 'none'}.`;
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };

  return (
    <>
      {live('rail') && <DayRail />}
      {live('thumb') && <ThumbBar />}
      <aside className="rv-panel" data-open={state.open ? '' : undefined} aria-label="Design review">
        <button type="button" className="rv-fold" aria-expanded={state.open} onClick={() => setState({ ...state, open: !state.open })}>
          <span className="rv-dot" aria-hidden="true" />
          Design review
          <span className="rv-count">{state.after ? `${approved.length} of ${PROPOSALS.length} on` : 'before'}</span>
        </button>
        {state.open && (
          <div className="rv-body" data-lenis-prevent="">
            <div className="rv-ab">
              <button type="button" aria-pressed={!state.after} onClick={() => setState({ ...state, after: false })}>Before</button>
              <button type="button" aria-pressed={state.after} onClick={() => setState({ ...state, after: true })}>After</button>
            </div>
            {([1, 2] as const).map(round => (
              <section key={round} className="rv-round">
                <h3 className="rv-round-title">{round === 1 ? 'Round 1, approved' : 'Round 2, new'}</h3>
                <ol className="rv-list">
                  {PROPOSALS.filter(p => p.round === round).map(p => (
                    <li key={p.id} data-on={state.on[p.id] ? '' : undefined}>
                      <div className="rv-row">
                        <span className="rv-num" aria-hidden="true">{String(PROPOSALS.indexOf(p) + 1).padStart(2, '0')}</span>
                        <span className="rv-title">{p.title}</span>
                        <button
                          type="button" role="switch" className="rv-switch" aria-checked={!!state.on[p.id]} aria-label={`${p.title}: keep`}
                          onClick={() => setState({ ...state, on: { ...state.on, [p.id]: !state.on[p.id] } })}
                        ><i /></button>
                      </div>
                      <p className="rv-why">{p.why}</p>
                      <p className="rv-meta">
                        {p.href && <a href={p.href}>Show me</a>}
                        {p.note && <span>{p.note}</span>}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
            <button type="button" className="rv-copy" onClick={copy}>{copied ? 'Copied. Paste it to Claude.' : 'Copy my choices'}</button>
          </div>
        )}
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// 01 The day rail. Section tops are measured once and again when the page's height changes (a
// ResizeObserver, debounced); the scroll handler only reads window.scrollY and writes one
// transform and, when the minute changes, one text node. No layout reads per frame.
// ---------------------------------------------------------------------------------------------

// Where each section sits in the day, in hours (the same story as components/site/ground.tsx).
const DAY: { id: string; label: string | null; hour: number }[] = [
  { id: 'top', label: null, hour: 7 },
  { id: 'contents', label: 'Where to?', hour: 9.5 },
  { id: 'phones', label: 'Blueberry', hour: 12 },
  { id: 'work', label: 'Projects', hour: 17.5 },
  { id: 'experience', label: 'Timeline', hour: 19.25 },
  { id: 'contact', label: 'Say hi', hour: 20.5 },
  { id: 'resume', label: 'Résumé', hour: 22 },
  { id: 'island', label: 'Island', hour: 23.5 },
];
const END_HOUR = 23.98;

function clock(hour: number) {
  const total = Math.round(hour * 60 / 5) * 5; // five-minute steps, so the text is calm
  const h = Math.floor(total / 60) % 24, m = total % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// The sun and the moon in the rail's disc (Andrew 2026-11-11: "use this animation but adapt it
// slightly", with the 21st.dev sun and moon theme toggle pasted). Kept from it: both bodies ride
// one circle centred below the disc, like a sky dome; the one leaving sets down its side of the
// arc, easing in and spinning, and the other rises up its own side a moment later and overshoots
// a little; a day sky and a night sky cross-fade behind them and the stars twinkle; a swap asked
// for mid-flight plays the running one backwards from where it is. Adapted: it is not a button and
// changes no theme (the scroll crossing DUSK drives it, both ways), it is quicker (1.1s, was 1.74),
// the skies are this page's own, and it is plain CSS classes (review.css) instead of Tailwind.
// Reduced motion: no flight, the bodies simply change places.
const DUSK = 19.5; // half past seven in the evening, as the timeline's rose turns to twilight
const SWAP_MS = 1100;
const ARC = 115; // the arc's radius, in percent of the disc
const STARS = [{ x: 22, y: 20, t: 2100 }, { x: 68, y: 16, t: 2600 }, { x: 80, y: 46, t: 1900 }, { x: 16, y: 66, t: 2500 }, { x: 56, y: 78, t: 2300 }];
type Body = { side: -1 | 1; spin: number };
const MOON: Body = { side: -1, spin: 25 };
const SUN: Body = { side: 1, spin: 120 };
const arcAt = (side: number, angle: number) => `translate(${side * ARC * Math.sin(angle)}%, ${ARC * (1 - Math.cos(angle))}%)`;
const easeOutBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
const frames = (body: Body, rising: boolean): Keyframe[] => Array.from({ length: 31 }, (_, i) => {
  const t = i / 30;
  const away = rising ? 1 - easeOutBack(t) : t * t * t; // how far down the arc, 0 at the middle of the disc
  return {
    offset: t,
    transform: `${arcAt(body.side, away * Math.PI / 2)} rotate(${body.side * body.spin * away}deg)${rising ? ` scale(${1 - 0.28 * away})` : ''}`,
    opacity: rising ? Math.min(1, t / 0.3) : t < 0.55 ? 1 : (1 - t) / 0.45,
  };
});
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';

function Celestial({ night }: { night: boolean }) {
  const sunRef = useRef<HTMLSpanElement>(null);
  const moonRef = useRef<HTMLSpanElement>(null);
  const dayRef = useRef<HTMLSpanElement>(null);
  const nightRef = useRef<HTMLSpanElement>(null);
  const flight = useRef<Animation[]>([]);
  const was = useRef(night);

  useLayoutEffect(() => {
    if (was.current === night) return;
    was.current = night;
    // asked again mid-flight: that is the running swap played backwards from where it is now
    if (flight.current.length) { flight.current.forEach(a => a.reverse()); return; }
    const sun = sunRef.current, moon = moonRef.current, day = dayRef.current, dark = nightRef.current;
    if (!sun || !moon || !day || !dark || still()) return;
    const sky = { duration: SWAP_MS, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'both' as const };
    const pair = [
      (night ? sun : moon).animate(frames(night ? SUN : MOON, false), { duration: SWAP_MS * 0.65, fill: 'both' }),
      (night ? moon : sun).animate(frames(night ? MOON : SUN, true), { duration: SWAP_MS * 0.64, delay: SWAP_MS * 0.36, fill: 'both' }),
      day.animate([{ opacity: night ? 1 : 0 }, { opacity: night ? 0 : 1 }], sky),
      dark.animate([{ opacity: night ? 0 : 1 }, { opacity: night ? 1 : 0 }], sky),
    ];
    flight.current = pair;
    Promise.all(pair.map(a => a.finished)).then(() => {
      if (flight.current !== pair) return;
      flight.current = [];
      pair.forEach(a => a.cancel()); // the resting styles below now say the same thing
    }, () => { /* cancelled on unmount */ });
  }, [night]);

  // The stars twinkle, each at its own pace; they are only seen while the night sky is up.
  useEffect(() => {
    const dark = nightRef.current;
    if (!dark || still()) return;
    const twinkles = Array.from(dark.children).map((star, i) =>
      star.animate([{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }], { duration: STARS[i]?.t ?? 2400, delay: -i * 530, iterations: Infinity, easing: 'ease-in-out' }));
    return () => twinkles.forEach(a => a.cancel());
  }, []);
  useEffect(() => () => { flight.current.forEach(a => a.cancel()); flight.current = []; }, []);

  const rest = (body: Body, up: boolean) => ({ transform: up ? 'none' : arcAt(body.side, Math.PI / 2), opacity: up ? 1 : 0 });
  return (
    <span className="rv-sun-disc">
      <span className="rv-sky" data-sky="night" ref={nightRef} style={{ opacity: night ? 1 : 0 }}>
        {STARS.map((s, i) => <span key={i} className="rv-star" style={{ left: `${s.x}%`, top: `${s.y}%` }} />)}
      </span>
      <span className="rv-sky" data-sky="day" ref={dayRef} style={{ opacity: night ? 0 : 1 }} />
      <span className="rv-orb" data-body="moon" ref={moonRef} style={rest(MOON, night)}><Moon fill="currentColor" aria-hidden="true" /></span>
      <span className="rv-orb" data-body="sun" ref={sunRef} style={rest(SUN, !night)}><Sun aria-hidden="true" /></span>
    </span>
  );
}

function DayRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const [ticks, setTicks] = useState<{ id: string; label: string; at: number }[]>([]);
  const [night, setNight] = useState(false); // past dusk: the sun has set and the moon is up (Celestial)

  useEffect(() => {
    let stops: { y: number; hour: number }[] = [];
    let max = 1;
    let frame = 0;
    let lastText = '';
    let lastNight = false;

    const measure = () => {
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const found = DAY.flatMap(d => {
        const el = document.getElementById(d.id);
        return el ? [{ ...d, y: Math.min(max, el.getBoundingClientRect().top + window.scrollY) }] : [];
      });
      stops = [...found.map(f => ({ y: f.y, hour: f.hour })), { y: max, hour: END_HOUR }];
      setTicks(found.filter(f => f.label).map(f => ({ id: f.id, label: f.label as string, at: f.y / max })));
      paint();
    };

    const paint = () => {
      frame = 0;
      const y = Math.min(max, Math.max(0, window.scrollY));
      const sun = sunRef.current, rail = railRef.current;
      if (!sun || !rail) return;
      // piecewise: find the two stops around y and blend their hours
      let hour = END_HOUR;
      for (let i = 0; i < stops.length - 1; i++) {
        if (y <= stops[i + 1].y) {
          const span = Math.max(1, stops[i + 1].y - stops[i].y);
          hour = stops[i].hour + (stops[i + 1].hour - stops[i].hour) * Math.min(1, Math.max(0, (y - stops[i].y) / span));
          break;
        }
      }
      sun.style.top = `${(y / max) * 100}%`;
      // 0 by day, 1 by night, turning between 6:30 and 8:00 in the evening
      sun.style.setProperty('--night', String(Math.min(1, Math.max(0, (hour - 18.5) / 1.5))));
      const isNight = hour >= DUSK;
      if (isNight !== lastNight) { lastNight = isNight; setNight(isNight); }
      const text = clock(hour);
      if (text !== lastText && timeRef.current) { timeRef.current.textContent = text; lastText = text; }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(paint); };

    let timer = 0;
    const ro = new ResizeObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(measure, 250); });
    ro.observe(document.body);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    measure();

    // Drag the sun (or press anywhere on the rail) to scrub the page: a timeline is a control.
    const rail = railRef.current;
    let dragging = false;
    const seek = (e: PointerEvent | MouseEvent) => {
      const inner = innerRef.current;
      if (!inner) return;
      const box = inner.getBoundingClientRect();
      const y = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)) * max;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    };
    // A press that moves more than 4px is a drag, wherever it starts, a dot included (the dots'
    // 44px hit boxes cover half the rail, and round 1 refused to drag from them: the bug Andrew
    // hit). A press that never moves is a click, so a dot still jumps to its section.
    let press: { y: number; id: number } | null = null;
    const down = (e: PointerEvent) => { if (e.button === 0) press = { y: e.clientY, id: e.pointerId }; };
    const move = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      if (!dragging && Math.abs(e.clientY - press.y) < 4) return;
      if (!dragging) { dragging = true; rail?.setPointerCapture(e.pointerId); rail?.setAttribute('data-drag', ''); }
      seek(e);
    };
    const up = () => {
      press = null;
      if (!dragging) return;
      rail?.removeAttribute('data-drag');
      // the click that follows a drag must not follow a dot's link
      window.setTimeout(() => { dragging = false; }, 0);
    };
    const click = (e: MouseEvent) => {
      if (dragging) { e.preventDefault(); e.stopPropagation(); return; }
      // a plain click on the bare track (not a dot) jumps there
      if (!(e.target as Element).closest('a')) seek(e);
    };
    const noDrag = (e: Event) => e.preventDefault(); // no native link drag ghost
    rail?.addEventListener('click', click, true);
    rail?.addEventListener('dragstart', noDrag);
    rail?.addEventListener('pointerdown', down);
    rail?.addEventListener('pointermove', move);
    rail?.addEventListener('pointerup', up);
    rail?.addEventListener('pointercancel', up);

    return () => {
      cancelAnimationFrame(frame); window.clearTimeout(timer); ro.disconnect();
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll);
      rail?.removeEventListener('pointerdown', down); rail?.removeEventListener('pointermove', move);
      rail?.removeEventListener('pointerup', up); rail?.removeEventListener('pointercancel', up);
      rail?.removeEventListener('click', click, true); rail?.removeEventListener('dragstart', noDrag);
    };
  }, []);

  return (
    <nav className="rv-rail" aria-label="The day, section by section">
      <div className="rv-rail-track" ref={railRef}>
        <div className="rv-rail-in" ref={innerRef}>
        {ticks.map(t => (
          <a key={t.id} className="rv-tick" href={`#${t.id}`} style={{ top: `${t.at * 100}%` }}>
            <span className="rv-tick-label">{t.label}</span>
          </a>
        ))}
        <div className="rv-sun" ref={sunRef} aria-hidden="true">
          <Celestial night={night} />
          <span className="rv-time" ref={timeRef} />
        </div>
        </div>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------------------------
// 04 One job in the light. An IntersectionObserver whose root is shrunk to the middle eighth of
// the screen marks the stop that is under it. The browser does the geometry; no scroll handler.
// ---------------------------------------------------------------------------------------------
function useSpotlight(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const items = Array.from(document.querySelectorAll<HTMLElement>('.experience .xp-item:not(.xp-end)'));
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => e.target.classList.toggle('rv-lit', e.isIntersecting));
    }, { rootMargin: '0px -44% 0px -44%' });
    items.forEach(el => io.observe(el));
    return () => { io.disconnect(); items.forEach(el => el.classList.remove('rv-lit')); };
  }, [on]);
}

// ---------------------------------------------------------------------------------------------
// 05 The résumé lands. The card waits below its place until its cell is a third on screen.
// ---------------------------------------------------------------------------------------------
function useLanding(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const section = document.querySelector<HTMLElement>('.resume');
    const cell = section?.querySelector<HTMLElement>('.rs-card-cell');
    if (!section || !cell) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) section.classList.add('rv-landed'); });
    }, { threshold: 0.35 });
    io.observe(cell);
    return () => { io.disconnect(); section.classList.remove('rv-landed'); };
  }, [on]);
}

// ---------------------------------------------------------------------------------------------
// 06 The thumb bar. Three plain in-page links; the director's link delegate (app/motion.tsx)
// scrolls them, and CSS shows, hides and highlights it from html[data-section].
// ---------------------------------------------------------------------------------------------
function ThumbBar() {
  return (
    <nav className="rv-thumb" aria-label="Quick links">
      <a href="#work" data-for="work">Work</a>
      <a href="#resume" data-for="resume" className="rv-thumb-main">Résumé</a>
      <a href="#contact" data-for="contact">Say hi</a>
    </nav>
  );
}
