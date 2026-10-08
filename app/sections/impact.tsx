import { IMAGES, IMPACT, IMPACT_HEAD, MICROCOPY, PROJECTS, sectionAttrs, type ImageKey } from '@/lib/site';
import { FlipHeading } from '@/components/site/flip-heading';
import { Marquee } from '@/components/site/marquee';
import impact from '@/lib/impact.json';
import { ImpactAccordion, type PanelView, type SeriesData, type SeriesView } from './impact.client';
import './impact.css';
import { CornerStickers } from '@/components/site/corner-stickers/corner-stickers';

// Impact (SITE-PLAN.md 4.6, A8): what the work measurably did, one accordion row per project.
// Every number comes from lib/impact.json (written by scripts/impact-data.mjs from disk and git);
// every word comes from IMPACT in lib/site.ts. A series is shown only when BOTH have it, so a
// metric the script could not derive simply is not on the page.
//
// A server component: it joins the copy to the numbers and builds each panel's summary line
// here, because IMPACT's summary templates are functions and a function cannot be passed to a
// client component as a prop. The accordion, tiles and charts live in impact.client.tsx.

const DATA = impact as { generated: string; panels: { id: string; series: SeriesData[] }[] };

const fmt = (n: number) => n.toLocaleString('en-US');

/** The unit to print after a number, unless the title already names it ("Indexed rows"). */
const unitFor = (title: string, unit: string) => (title.toLowerCase().includes(unit.toLowerCase()) ? null : unit);

function buildPanels(): PanelView[] {
  return IMPACT.flatMap(copy => {
    const found = DATA.panels.find(p => p.id === copy.id);
    if (!found) return [];
    const series: SeriesView[] = copy.series.flatMap(text => {
      const data = found.series.find(s => s.id === text.id);
      return data ? [{ ...data, title: text.title, unit: text.unit, shownUnit: unitFor(text.title, text.unit), caption: text.caption ?? null }] : [];
    });
    if (!series.length) return [];

    // The summary and the panel's big number read the primary series: its total and its first
    // and last dates. A running total's last point is the total; a per-period series is summed.
    const primary = series.find(s => s.id === copy.primary);
    const points = primary?.points ?? [];
    const total = primary && points.length
      ? (primary.kind === 'line' ? points[points.length - 1].y : points.reduce((n, p) => n + p.y, 0))
      : null;
    const summary = total !== null
      ? copy.summary({ total, first: String(points[0].x), last: String(points[points.length - 1].x) })
      : null;
    const heroTitle = copy.hero ?? primary?.title ?? '';
    const hero = total !== null && primary ? { value: total, title: heroTitle, unit: primary.unit, shownUnit: unitFor(heroTitle, primary.unit) } : null;

    // Counts by kind are parts of one whole, so they draw as a unit grid (one square per
    // memory) beside the big number instead of as one more chart tab.
    const units = series.find(s => s.kind === 'bar' && s.dim === 'kind') ?? null;
    // A stat that repeats the big number (same unit, same value) would say it twice.
    const stats = series.filter(s => s.kind === 'stat' && !(hero && s.unit === hero.unit && s.value === hero.value));
    const charts = series.filter(s => s.kind !== 'stat' && s !== units);

    // The project's own screenshot, when it has one (PROJECTS[].image names an IMAGES entry).
    const key = PROJECTS.find(p => p.id === copy.id)?.image as ImageKey | null | undefined;
    const img = key ? IMAGES[key] : null;
    const image = img
      ? 'sm' in img
        ? { src: img.sm, w: img.smW, h: Math.round(img.h * img.smW / img.w), alt: img.alt }
        : { src: img.src, w: img.w, h: img.h, alt: img.alt }
      : null;

    return [{
      id: copy.id,
      title: copy.title,
      summary,
      hero,
      units,
      image,
      stats,
      // The primary chart first, then the others in IMPACT order.
      charts: [...charts.filter(s => s.id === copy.primary), ...charts.filter(s => s.id !== copy.primary)],
    }];
  });
}

export default function Impact() {
  const panels = buildPanels();
  // The ticker: every headline number in the section, grouped under its project. The words are
  // PROJECTS and IMPACT titles and the numbers come from lib/impact.json, so nothing is new copy.
  const ticker = panels.map(p => ({
    id: p.id,
    title: p.title,
    items: [
      ...(p.hero ? [{ n: p.hero.value, unit: p.hero.shownUnit, t: p.hero.title, k: `${p.id}-hero` }] : []),
      ...p.stats.map(s => ({ n: s.value ?? 0, unit: s.shownUnit, t: s.title, k: s.id })),
    ],
  })).filter(g => g.items.length);
  const said = ticker.map(g => `${g.title}: ${g.items.map(i => `${fmt(i.n)}${i.unit ? ` ${i.unit}` : ''} ${i.t}`).join(', ')}`).join('. ');

  return (
    <section {...sectionAttrs('impact')} className="impact" aria-labelledby="impact-title">
      <CornerStickers set="impact" />
      <header className="impact-head">
        <span className="eyebrow">{IMPACT_HEAD.eyebrow}</span>
        <FlipHeading id="impact-title" text={IMPACT_HEAD.headline} max={150} />
      </header>
      {ticker.length > 0 && (
        <Marquee className="impact-ticker" duration={48} label={said}>
          {ticker.map(g => (
            <span className="impact-tick-group" key={g.id}>
              <span className="impact-tick-p">{g.title}</span>
              {g.items.map(i => (
                <span className="impact-tick" key={i.k}>
                  <span className="impact-tick-n">{fmt(i.n)}{i.unit && <small>{i.unit}</small>}</span>
                  <span className="impact-tick-t">{i.t}</span>
                </span>
              ))}
            </span>
          ))}
        </Marquee>
      )}
      <ImpactAccordion panels={panels} labels={{ howMeasured: MICROCOPY.howMeasured, showData: MICROCOPY.showData }} />
    </section>
  );
}
