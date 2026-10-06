'use client';
import { useMemo } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ErrorBar, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { Point, SeriesView } from '@/app/sections/impact.client';

// One Impact chart (SITE-PLAN.md 4.6), adapted in place from the saved shadcn chart wrapper,
// whose Tailwind theme classes did not fit the /andliu tokens; what stays is the idea of one
// small wrapper over recharts. This module is only ever loaded with React.lazy from
// app/sections/impact.client.tsx, so recharts lands in its own chunk, never the landing's.
//
// Forms (dataviz skill): a running total is a step line; counts are bars; arms with long names
// are horizontal bars (memories by kind is a unit grid in the section itself); lookup time is bars with a p90 whisker; tokens to read sit on a log axis.
// One y axis per chart, every axis labelled, keyboard tooltips via recharts' accessibilityLayer.
//
// Palette, validated with the dataviz skill's validate_palette.js against --card #fbf8f1
// (re-run 2026-10-01, light mode):
//   series 1 --berry #3b4f9e (7.08:1), series 2 --tile-teal #2f9e8f (3.09:1),
//   series 3 --tile-violet #8555bf (4.89:1), series 4 --tile-apricot #e98a5a (2.40:1).
//   Adjacent pairs: all checks pass, worst CVD dE 15.5 (violet and teal, deutan), worst normal
//   dE 24.1. The plan's series 3 --tile-pink #d6689a (3.14:1) failed CVD separation next to
//   teal (deutan dE 3.7) and its series 4 --ink-2 #3b3a4f (10.40:1) failed the chroma floor
//   (reads grey), so pink became violet and ink-2 became apricot. Apricot is under 3:1, a WARN
//   whose relief is the direct label with its count beside every swatch plus the table. Across
//   ALL pairs violet and berry sit at normal dE 13.0 (a FAIL), so they must never touch: the
//   only four-colour use, the memories unit grid in app/sections/impact.client.tsx, groups
//   each kind into one run, so only neighbours meet. Charts here use series 1 and 2 only.
//   Gridlines --line, axis text --muted #5b5a6e (6.32:1), values and labels --ink-2. Text never
//   wears a series colour.

/** Reads a colour token from :root, so this file holds no hex of its own. */
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const isTime = (dim?: string) => dim === 'date' || dim === 'week';
const fmt = (n: number) => n.toLocaleString('en-US');

export default function ImpactChart({ series, reduced }: { series: SeriesView; reduced: boolean }) {
  // useMemo: read the tokens once per mount, not on every hover re-render.
  const c = useMemo(() => ({
    s1: token('--berry'), s2: token('--tile-teal'), grid: token('--line'), axis: token('--muted'), text: token('--ink-2'), ink: token('--ink'), card: token('--card'),
  }), []);
  const points = series.points ?? [];
  const animate = !reduced;
  const tick = { fill: c.axis, fontSize: 12 };
  const tickFormatter = isTime(series.dim) ? (x: string) => x.slice(5) : undefined;
  const yLabel = { value: series.unit, angle: -90, position: 'insideLeft' as const, fill: c.axis, fontSize: 12, style: { textAnchor: 'middle' as const } };
  const xLabel = { value: series.dim, position: 'insideBottom' as const, offset: -2, fill: c.axis, fontSize: 12 };

  // The tooltip is plain HTML (styled in impact.css): the x value, then each number in ink.
  const tip = ({ active, payload }: TooltipContentProps) => {
    const p = payload?.[0]?.payload as Point | undefined;
    if (!active || !p) return null;
    return (
      <div className="impact-tip">
        <span className="impact-tip-x">{p.x}</span>
        <span>{fmt(p.y)} {series.fields ? series.fields.y : series.unit}</span>
        {series.fields && p.y2 !== undefined && <span>{fmt(p.y2)}{p.n !== undefined ? `/${p.n}` : ''} {series.fields.y2}</span>}
      </div>
    );
  };
  const tooltip = <Tooltip content={tip} cursor={{ stroke: c.grid, fill: c.grid, fillOpacity: 0.35 }} isAnimationActive={false} />;

  // A running total: a step line over a soft fill, so a flat stretch reads as "nothing added
  // that day" and the area shows the pile growing. One direct label: the latest total.
  if (series.kind === 'line') {
    const last = points.length - 1;
    const endLabel = ({ x, y, index }: { x?: number | string; y?: number | string; index?: number }) => (
      index === last && x !== undefined && y !== undefined
        ? <text x={Number(x) - 6} y={Number(y) - 10} textAnchor="end" fill={c.ink} fontSize={14} fontWeight={700}>{fmt(points[last].y)}</text>
        : null
    );
    return (
      <div className="impact-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} accessibilityLayer margin={{ top: 28, right: 16, bottom: 16, left: 8 }}>
            <CartesianGrid stroke={c.grid} vertical={false} />
            <XAxis dataKey="x" tick={tick} tickFormatter={tickFormatter} minTickGap={24} stroke={c.grid} label={xLabel} height={44} />
            <YAxis tick={tick} stroke={c.grid} allowDecimals={false} label={yLabel} width={56} />
            {tooltip}
            <Area
              type="stepAfter"
              dataKey="y"
              stroke={c.s1}
              strokeWidth={2}
              fill={c.s1}
              fillOpacity={0.14}
              dot={false}
              activeDot={{ r: 5, stroke: c.card, strokeWidth: 2, fill: c.s1 }}
              label={endLabel}
              isAnimationActive={animate}
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Arms and kinds have word labels: horizontal bars, so the names read without rotating.
  if ((series.dim === 'arm' && series.id !== 'brain.latency' && series.scale !== 'log') || series.dim === 'kind') {
    const longest = Math.max(...points.map(p => p.x.length));
    const labelled = points.map(p => ({ ...p, label: series.fields ? `${p.y2 ?? ''}${p.n !== undefined ? `/${p.n}` : ''} ${series.fields.y2}` : '' }));
    return (
      <div className="impact-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={labelled} layout="vertical" accessibilityLayer margin={{ top: 8, right: series.fields ? 96 : 24, bottom: 16, left: 24 }} barCategoryGap="28%">
            <CartesianGrid stroke={c.grid} horizontal={false} />
            <XAxis type="number" tick={tick} stroke={c.grid} tickFormatter={fmt} label={{ ...xLabel, value: series.unit }} height={44} />
            <YAxis type="category" dataKey="x" tick={tick} stroke={c.grid} width={Math.min(150, longest * 7 + 8)} label={{ ...yLabel, value: series.dim, position: 'left' as const }} />
            {tooltip}
            <Bar dataKey="y" fill={c.s1} radius={[0, 4, 4, 0]} isAnimationActive={animate} animationDuration={800}>
              {/* "26/27 correct": the score next to the cost, in text ink, never the bar colour. */}
              {series.fields && (
                <LabelList dataKey="label" position="right" fill={c.text} fontSize={12} />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Columns: weekly commits, content counts, lookup time with its p90 whisker, tokens on a log axis.
  const log = series.scale === 'log';
  const ys = points.map(p => p.y).filter(y => y > 0);
  const logDomain: [number, number] = [10 ** Math.floor(Math.log10(Math.min(...ys))), 10 ** Math.ceil(Math.log10(Math.max(...ys)))];
  const logTicks: number[] = [];
  for (let t = logDomain[0]; t <= logDomain[1]; t *= 10) logTicks.push(t);
  // The whisker runs from the median (the bar top) up to p90.
  const data = series.fields && series.id === 'brain.latency' ? points.map(p => ({ ...p, err: [0, (p.y2 ?? p.y) - p.y] })) : points;
  const whisker = series.id === 'brain.latency' && series.fields;

  return (
    <div className="impact-chart-wrap">
      {whisker && (
        <ul className="impact-legend">
          <li><span className="impact-key impact-key-bar" style={{ background: c.s1 }} />{series.fields?.y}</li>
          <li><span className="impact-key impact-key-line" style={{ background: c.s2 }} />{series.fields?.y2}</li>
        </ul>
      )}
      <div className="impact-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} accessibilityLayer margin={{ top: 8, right: 12, bottom: 16, left: 8 }} barCategoryGap={points.length > 8 ? '18%' : '32%'}>
            <CartesianGrid stroke={c.grid} vertical={false} />
            <XAxis dataKey="x" tick={tick} tickFormatter={tickFormatter} minTickGap={16} stroke={c.grid} label={xLabel} height={44} />
            <YAxis
              tick={tick}
              stroke={c.grid}
              width={64}
              label={yLabel}
              tickFormatter={fmt}
              allowDecimals={false}
              {...(log ? { scale: 'log' as const, domain: logDomain, ticks: logTicks, allowDataOverflow: true } : {})}
            />
            {tooltip}
            <Bar dataKey="y" fill={c.s1} radius={[4, 4, 0, 0]} isAnimationActive={animate} animationDuration={800}>
              {whisker && <ErrorBar dataKey="err" direction="y" width={10} strokeWidth={2} stroke={c.s2} />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
