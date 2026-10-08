'use client';
import { lazy, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RollingRow } from '@/components/ui/rolling-list';
import { NearViewport } from '@/components/site/near-viewport';
import { TiltFrame } from '@/components/site/tilt-frame';
import { preserveAnchor } from '@/components/site/jump';
import { emit, EVENTS } from '@/components/site/handoffs';
import { useReducedMotion, isReducedMotion } from '@/components/site/use-reduced-motion';
import { SKYLINE } from '@/lib/site';

// The Impact accordion (SITE-PLAN.md 4.6). One row per project; the first is open by default;
// opening one closes the others. Click, Enter or Space toggles (a real <button>, so Enter and
// Space come free); hover only rolls the title (RollingRow's CSS). ArrowUp, ArrowDown, Home and
// End move focus between the row buttons.
//
// Inside an open panel, left: the project's big number (counts up), its picture (the memories
// as a unit grid, or the project's screenshot in a TiltFrame) and its stat tiles. Right: one
// chart at a time behind numbered tabs, then one "How this was measured" and one "Show the
// numbers" for the whole panel, both on the left edge, clear of the chat launcher's corner.
//
// recharts is never in the landing's first download: the chart module is loaded with
// React.lazy (code splitting: import() becomes its own chunk) and only mounted by NearViewport
// when an open panel comes near the viewport.

const ImpactChart = lazy(() => import('@/components/ui/chart'));
// The commits-per-day series ('days') draws as the contribution skyline, split out the same way.
const Skyline = lazy(() => import('@/components/ui/contribution-skyline'));

export type Point = { x: string; y: number; y2?: number; n?: number };
export type SeriesData = {
  id: string;
  kind: string; // 'line' | 'bar' | 'stat' | 'days' (one point per day, drawn as the skyline)
  unit: string;
  dim?: string; // what x is: date, week, kind, arm, item
  fields?: { y: string; y2: string }; // names of y and y2, from the source file's own keys
  scale?: string; // 'log' for brain.toRead
  points?: Point[];
  value?: number;
  source: string;
};
/** shownUnit: the unit printed after a number, null when the title already names it. */
export type SeriesView = SeriesData & { title: string; caption: string | null; shownUnit: string | null };
export type PanelView = {
  id: string;
  title: string;
  summary: string | null;
  hero: { value: number; title: string; unit: string; shownUnit: string | null } | null;
  units: SeriesView | null;
  image: { src: string; w: number; h: number; alt: string } | null;
  stats: SeriesView[];
  charts: SeriesView[];
};
type Labels = { howMeasured: string; showData: string };

const fmt = (n: number) => n.toLocaleString('en-US');
const pad = (i: number) => String(i + 1).padStart(2, '0');

export function ImpactAccordion({ panels, labels }: { panels: PanelView[]; labels: Labels }) {
  const [open, setOpen] = useState(0);
  // Which panel, if any, collapses with no transition: the open one when it sits ABOVE the row
  // being clicked, so that row does not slide up under the pointer while the panel shrinks.
  const [instant, setInstant] = useState(-1);
  const reduced = useReducedMotion();

  const toggle = (i: number) => {
    const next = open === i ? -1 : i;
    // preserveAnchor measures the block at the viewport centre, runs the change, and scrolls back
    // by however far that block moved. flushSync makes React apply the state change to the DOM
    // right now, inside that callback, instead of later in a batch, so the measurement is real.
    preserveAnchor(() => flushSync(() => {
      setInstant(open !== -1 && open < i ? open : -1);
      setOpen(next);
    }));
    if (next !== -1) emit(EVENTS.mascotMood, { mood: 'cheer', ms: 1200 });
    // Re-measure the pins below once the height animation has finished.
    window.setTimeout(() => ScrollTrigger.refresh(), isReducedMotion() ? 0 : 400);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = panels.length - 1;
    const to = { ArrowDown: i === last ? 0 : i + 1, ArrowUp: i === 0 ? last : i - 1, Home: 0, End: last }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    document.getElementById(`impact-btn-${panels[to].id}`)?.focus();
  };

  // A fragment, so each row is a direct child of the section: preserveAnchor anchors on the
  // section's child at the viewport centre, and a row is the block that should stay put.
  return (
    <>
      {panels.map((panel, i) => {
        const isOpen = open === i;
        return (
          <div className="impact-row" key={panel.id} data-open={isOpen ? '' : undefined}>
            <h3 className="impact-h">
              <RollingRow
                as="button"
                type="button"
                id={`impact-btn-${panel.id}`}
                aria-expanded={isOpen}
                aria-controls={`impact-panel-${panel.id}`}
                onClick={() => toggle(i)}
                onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => onKeyDown(e, i)}
                lead={(
                  <span className="impact-lead" aria-hidden="true">
                    <span className="impact-icon" />
                    <span className="impact-num">{pad(i)}</span>
                  </span>
                )}
                meta={panel.summary ? <span className="impact-summary">{panel.summary}</span> : undefined}
              >
                {panel.title}
              </RollingRow>
            </h3>
            <div
              className="impact-wrap"
              id={`impact-panel-${panel.id}`}
              role="region"
              aria-labelledby={`impact-btn-${panel.id}`}
              data-instant={instant === i ? '' : undefined}
              // inert: a closed panel's links and buttons cannot be tabbed into or read out.
              inert={!isOpen}
            >
              <div className="impact-inner">
                <Panel panel={panel} open={isOpen} reduced={reduced} labels={labels} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/**
 * Counts a number up from 0 once, the first time `run` turns true. The digits are written
 * straight into the DOM each frame (a ref, not state), so React does not re-render 60 times a
 * second. The server markup already holds the final number, which is what you get with
 * JavaScript off or reduced motion.
 */
function useCountUp(value: number, run: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !run || done.current) return;
    done.current = true;
    el.textContent = '0';
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      el.textContent = fmt(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(frame); el.textContent = fmt(value); };
  }, [run, value]);
  return ref;
}

function Panel({ panel, open, reduced, labels }: { panel: PanelView; open: boolean; reduced: boolean; labels: Labels }) {
  const [tab, setTab] = useState(0);
  const [showTable, setShowTable] = useState(false);
  // live: this panel is open AND has been on screen since it opened. It starts the count-ups
  // and (as data-live) the CSS entrances, so they play where someone can see them.
  const [live, setLive] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  useEffect(() => {
    if (!open) { setLive(false); return; }
    const el = card.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setLive(true);
    }, { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = panel.charts.length - 1;
    const to = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    setTab(to);
    tabs.current[to]?.focus();
  };

  const current = panel.charts[tab];
  // Every source in this panel, the chart on show first.
  const sources = [current, panel.units, ...panel.stats].filter((s): s is SeriesView => Boolean(s));
  const countUp = live && !reduced;

  return (
    // data-wide: the skyline wants the card's full width, so the number and tiles go above it
    // in one row (impact.css) instead of a tall column with dead ground under the tiles.
    <div className="impact-card" ref={card} data-live={live ? '' : undefined} data-wide={current?.kind === 'days' ? '' : undefined}>
      <div className="impact-side">
        {panel.hero && <Hero hero={panel.hero} run={countUp} />}
        {panel.units && <UnitGrid series={panel.units} />}
        {!panel.units && panel.image && (
          <TiltFrame
            className="impact-shot"
            max={5}
            shift={12}
            layers={[
              { node: <span className="impact-shot-back" />, depth: 0 },
              { node: <img src={panel.image.src} alt={panel.image.alt} width={panel.image.w} height={panel.image.h} loading="lazy" decoding="async" />, depth: 0.7 },
            ]}
          />
        )}
        {panel.stats.length > 0 && (
          <ul className="impact-stats">
            {panel.stats.map(stat => <StatTile key={stat.id} stat={stat} run={countUp} />)}
          </ul>
        )}
      </div>

      {current && (
        <div className="impact-stage">
          {panel.charts.length > 1 && (
            <div className="impact-tabs" role="tablist" aria-label={panel.title}>
              {panel.charts.map((chart, i) => (
                <button
                  key={chart.id}
                  // A callback ref: React calls it with each tab element, so one array ref holds
                  // them all for the arrow keys, without one useRef per tab.
                  ref={el => { tabs.current[i] = el; }}
                  type="button"
                  role="tab"
                  id={`${base}-tab-${i}`}
                  className="impact-tab"
                  aria-selected={tab === i}
                  aria-controls={`${base}-tp-${i}`}
                  tabIndex={tab === i ? 0 : -1}
                  onClick={() => setTab(i)}
                  onKeyDown={e => onTabKey(e, i)}
                >
                  {pad(i)}
                  <span className="sr-only"> {chart.title}</span>
                </button>
              ))}
            </div>
          )}
          {panel.charts.map((chart, i) => (
            <div
              key={chart.id}
              className="impact-tp"
              id={`${base}-tp-${i}`}
              role={panel.charts.length > 1 ? 'tabpanel' : undefined}
              aria-labelledby={panel.charts.length > 1 ? `${base}-tab-${i}` : undefined}
              hidden={tab !== i}
            >
              <ChartBlock chart={chart} live={open && tab === i} reduced={reduced} tableId={`${base}-tbl-${i}`} showTable={showTable} />
            </div>
          ))}
          <div className="impact-foot">
            <button
              type="button"
              className="impact-show"
              aria-expanded={showTable}
              aria-controls={`${base}-tbl-${tab}`}
              onClick={() => setShowTable(v => !v)}
            >
              {labels.showData}
            </button>
            <details className="impact-how">
              <summary>{labels.howMeasured}</summary>
              <dl className="impact-src">
                {sources.map(s => (
                  <div key={s.id}>
                    <dt>{s.title}</dt>
                    <dd>{s.source}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

function Hero({ hero, run }: { hero: NonNullable<PanelView['hero']>; run: boolean }) {
  const ref = useCountUp(hero.value, run);
  return (
    <p className="impact-hero">
      <span className="impact-hero-n">
        <span ref={ref} aria-hidden="true">{fmt(hero.value)}</span>
        <span className="sr-only">{fmt(hero.value)}</span>
        {hero.shownUnit && <small> {hero.shownUnit}</small>}
      </span>
      <span className="impact-hero-t">{hero.title}</span>
    </p>
  );
}

/**
 * One square per item, coloured by kind and grouped so each kind is one run: the palette was
 * validated for neighbours only (see components/ui/chart.tsx). The squares pop in on a stagger
 * once the panel is live (CSS, --i is each square's place). Hovering a legend entry dims the
 * other kinds (CSS :has, no state). The legend is decoration; the sr-only table is what is read.
 */
function UnitGrid({ series }: { series: SeriesView }) {
  const points = series.points ?? [];
  const squares = points.flatMap((p, k) => Array.from({ length: p.y }, () => k));
  return (
    <figure className="impact-units">
      <figcaption className="impact-units-t">{series.title}</figcaption>
      <div className="impact-unit-grid" aria-hidden="true">
        {squares.map((k, i) => <span key={i} className="impact-unit" data-k={k} style={{ '--i': i } as CSSProperties} />)}
      </div>
      <ul className="impact-unit-legend" aria-hidden="true">
        {points.map((p, k) => (
          <li key={p.x} data-k={k}><span className="impact-unit-key" /><b>{fmt(p.y)}</b> {p.x}</li>
        ))}
      </ul>
      <table className="sr-only">
        <caption>{series.title}</caption>
        <thead><tr><th scope="col">{series.dim}</th><th scope="col">{series.unit}</th></tr></thead>
        <tbody>{points.map(p => <tr key={p.x}><th scope="row">{p.x}</th><td>{p.y}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

function StatTile({ stat, run }: { stat: SeriesView; run: boolean }) {
  const value = stat.value ?? 0;
  const ref = useCountUp(value, run);
  return (
    <li className="impact-stat">
      <span className="impact-stat-n">
        <span ref={ref} aria-hidden="true">{fmt(value)}</span>
        <span className="sr-only">{fmt(value)}</span>
        {stat.shownUnit && <small> {stat.shownUnit}</small>}
      </span>
      <span className="impact-stat-t">{stat.title}</span>
    </li>
  );
}

function ChartBlock({ chart, live, reduced, tableId, showTable }: { chart: SeriesView; live: boolean; reduced: boolean; tableId: string; showTable: boolean }) {
  const points = chart.points ?? [];
  const placeholder = <div className={`impact-chart impact-chart-ph${chart.kind === 'days' ? ' impact-chart-days' : ''}`} aria-hidden="true" />;
  const yHead = chart.fields ? `${chart.fields.y} (${chart.unit})` : chart.unit;

  return (
    <figure className="impact-fig">
      <figcaption className="impact-fig-head">
        <h4 className="impact-fig-title">{chart.title}</h4>
        {chart.caption && <p className="impact-fig-cap">{chart.caption}</p>}
      </figcaption>
      {/* The chart is mounted only for the open panel's selected tab, and only near the
          viewport; otherwise a same-height placeholder holds its space. */}
      {live ? (
        <NearViewport placeholder={placeholder} margin="100%">
          {chart.kind === 'days'
            ? <Skyline points={points} unit={chart.unit} reduced={reduced} labels={SKYLINE} />
            : <ImpactChart series={chart} reduced={reduced} />}
        </NearViewport>
      ) : placeholder}
      {/* The accessible alternative to the chart. Collapsed, it is still in the page for screen
          readers (sr-only); shown, it scrolls inside its own box. */}
      <div
        id={tableId}
        className={showTable ? 'impact-table-box' : 'sr-only'}
        role="region"
        aria-label={chart.title}
        tabIndex={showTable ? 0 : undefined}
      >
        <table className="impact-table">
          <caption className="sr-only">{chart.title}</caption>
          <thead>
            <tr>
              <th scope="col">{chart.dim}</th>
              <th scope="col">{yHead}</th>
              {chart.fields && <th scope="col">{chart.fields.y2}</th>}
              {points.some(p => p.n !== undefined) && <th scope="col">n</th>}
            </tr>
          </thead>
          <tbody>
            {points.map(p => (
              <tr key={p.x}>
                <th scope="row">{p.x}</th>
                <td>{p.y}</td>
                {chart.fields && <td>{p.y2}</td>}
                {p.n !== undefined && <td>{p.n}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
