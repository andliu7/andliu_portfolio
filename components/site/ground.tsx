'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AfterLoad } from './after-load';
import { ContourCanvas } from './contour-bg';
import './ground.css';

// The one ground (gauntlet "ground", bar: landonorris.com). Every section is transparent; this
// single backdrop runs from the top of the page to the top of the footer and carries the colour
// for all of them, so no section edge can paint a seam. The page is one day, scrolled (Andrew,
// 2026-11-03): the hero's own morning sky, late morning under Where to?, noon under the phones,
// golden hour under the work, dusk going rose under the timeline, twilight under contact, night
// under the résumé and deep night under the island, with stars there and nowhere else, then down
// to the footer's black. Section colour survives only as these long blends, never as an edge.
//
// Four layers:
//   1. the colour ramp, one linear gradient, moves with the page (1x);
//   2. soft glows (the sun by day, lamps by night), radial gradients on a CSS scroll timeline at 0.7 to 0.8x;
//   3. the contour lines, drawn once, in two sticky panes: ink at low alpha over the day, paper at
//      low alpha over the night, cross-fading where dusk turns to twilight (masks in ground.css);
//   4. the stars, CSS radial gradients behind the island only, fading in below the résumé.
// The glows and lines move on the compositor (scroll-driven animations, ground.css), so scrolling
// costs no script and no repaint. JavaScript only measures where the sections are, on load and on
// resize, to place the colour stops, glows, line panes and stars; with no script the CSS fallback shows.
// Reduced motion: no scroll timelines and no twinkle; everything sits where it is meant to.

// A colour stop, pinned to an element's edge (at: a selector for its top, 'selector/' for its
// bottom, 'a|b' for the first that exists) plus dy px plus vh screens; dy 'title' is 60px above
// Where to?'s title.
type Stop = { at: string; dy: number | 'title' | (() => number); vh?: number; colour: string };

// True when the element exists and is laid out (not display:none).
const shown = (sel: string) => !!document.querySelector<HTMLElement>(sel)?.getClientRects().length;

// Contrast (WCAG 2.x, computed): the text on each light ground is ink (#12142b) with --on-2 ink-2
// (#3b3a4f, paper sections) or berry-deep (#1d2654, apricot sections). Lowest point of each band:
//   late morning #cfe2f5 to #bfe3f0   ink 13.3, ink-2 8.1
//   noon #b4d1f0                       ink 11.5, ink-2 7.0, berry 4.76
//   golden hour #ffd9a0 to #ffc98a     ink 12.0, berry-deep 9.6
//   dusk #f6b892 to #e8a08c            ink 8.5, berry-deep 6.75 (the timeline's heading rides the pin,
//                                      so dusk holds until one screen above the section's foot,
//                                      below the last place the heading can sit)
//   twilight #4d4a94 to berry          paper 6.6, berry-soft 4.97, apricot 5.23
//   night, berry-deep and darker       paper 12.6 or more
// Between dusk and twilight (L .28 to .10) neither the timeline's small berry-deep type nor
// contact's small berry-soft type holds 4.5:1, so the last of that blend is pinned between the
// timeline's last line on the sky (its skip hint, 30px above the section's foot when the pin ends;
// the frame is sticky, so it is not measured live) and contact's eyebrow (measured).
// Over the timeline's last screen the rose only deepens to mauve, so the drop at the seam is short.
const SKY = '#87ceeb'; // Cloudscape's own sky (components/ui/cloudscape.tsx), under the hero's fade
const STOPS: Stop[] = [
  { at: '#top', dy: 0, colour: SKY },
  { at: '#top/', dy: -150, colour: SKY },
  { at: '#top/', dy: 60, colour: '#b9dcf0' }, // the morning sky lifting
  { at: '#contents', dy: 'title', colour: '#cfe2f5' }, // late morning, palest
  { at: '#contents/', dy: -260, colour: '#c3dcf2' },
  { at: '#phones', dy: 420, colour: '#b4d1f0' }, // noon, the bluest
  { at: '#phones/', dy: -420, colour: '#b4d1f0' },
  { at: '#work', dy: 160, colour: '#ffe2ae' }, // golden hour comes in pale
  { at: '#work/', dy: -200, colour: '#ffc98a' }, // and warms
  { at: '#experience', dy: 0, colour: '#f6b892' }, // dusk, rose
  { at: '#experience/', dy: 240, vh: -1, colour: '#e8a08c' }, // below the pinned heading's lowest seat
  // mauve, under the timeline's skip hint at the end of its pin (berry-deep 5.18); with no hint
  // (phones), the blend starts 200px higher and runs longer
  { at: '#experience/', dy: () => (shown('#experience .xp-esc') ? -24 : -200), colour: '#c98a95' },
  { at: '#contact', dy: 170, colour: '#93709f' }, // the middle of dusk into twilight, on contact's empty top (Andrew 2026-11-03: "smoother to compare notes")
  { at: '#contact .eyebrow|#contact', dy: -6, colour: '#5a4e98' }, // twilight by contact's first line (berry-soft 4.67)
  { at: '#contact .eyebrow/|#contact', dy: 120, colour: '#4d4a94' },
  { at: '#contact/', dy: -500, colour: 'var(--berry)' },
  { at: '#resume', dy: 360, colour: 'var(--berry-deep)' }, // night
  { at: '#resume/', dy: -100, colour: 'color-mix(in srgb, var(--berry-deep) 45%, var(--ink))' },
  { at: '#island', dy: 200, colour: '#0f1230' }, // deep night
  { at: '#island/', dy: -200, colour: '#0b0d1f' },
  { at: '#island/', dy: 0, colour: 'color-mix(in srgb, #0b0d1f 60%, #0c0a09)' }, // toward the footer's black
];

// Where the day's ink lines hand over to the night's paper lines (the dusk into violet blend).
const SWITCH: Stop = { at: '#experience/', dy: -200, colour: '' };

// The glows: where each sits when its section is in view (at, f = fraction down the section, x),
// its colour and size, and k, the share of scroll it lags by (0.3 = moves at 0.7x the page).
// By day they only lighten the sky, which only raises ink's contrast; by night the lightest
// (berry-soft at .10 over berry) still gives paper 6:1.
type Glow = { at: string; f: number; x: string; colour: string; size: string; k: number };
const GLOWS: Glow[] = [
  // One sun (Andrew 2026-11-04: "maybe just one sun"): the low golden-hour sun over the work. The
  // white morning and noon glows and the rose one under the timeline read as extra suns, so they went.
  { at: '#work', f: 0.5, x: '80%', colour: 'rgb(255 244 214 / .6)', size: 'min(80vw, 1000px)', k: 0.2 }, // the low sun
  { at: '#contact', f: 0.55, x: '28%', colour: 'rgb(255 207 152 / .10)', size: 'min(80vw, 1000px)', k: 0.22 }, // a warm lamp by the letter
  { at: '#resume', f: 0.55, x: '76%', colour: 'rgb(91 111 214 / .18)', size: 'min(80vw, 1000px)', k: 0.26 },
];

type Layout = {
  height: number; ramp: string; glows: { top: number }[]; travel: number; reduced: boolean;
  day: { top: number; bottom: number }; night: { top: number }; stars: number;
};

// The line panes overlap by this much and cross-fade over it (ground.css masks).
const FADE = 480;

export default function Ground() {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    const el = ref.current;
    const main = el?.parentElement;
    if (!el || !main) return;
    const root = document.documentElement;
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const measure = () => {
      frame = 0;
      const base = main.getBoundingClientRect().top;
      const vh = window.innerHeight;
      const edge = (at: string): number | null => {
        if (at.includes('|')) {
          for (const alt of at.split('|')) { const y = edge(alt); if (y != null) return y; }
          return null;
        }
        const bottom = at.endsWith('/');
        const node = document.querySelector<HTMLElement>(bottom ? at.slice(0, -1) : at);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        return (bottom ? box.bottom : box.top) - base;
      };
      const title = document.querySelector<HTMLElement>('#contents .toc-title');
      const titleTop = title ? title.getBoundingClientRect().top - base : null;
      const place = (s: Stop) => {
        const y = edge(s.at);
        if (y == null) return null;
        if (s.dy === 'title') return titleTop != null ? titleTop - 60 : y + 200;
        return y + (typeof s.dy === 'function' ? s.dy() : s.dy) + (s.vh ?? 0) * vh;
      };
      const footer = main.querySelector<HTMLElement>(':scope > .ft');
      // The footer is sticky, so its own box reports where it is stuck, not where it sits: measure
      // main's height less the footer's instead (the backdrop is absolute, so it adds nothing).
      const full = main.getBoundingClientRect().height;
      const height = footer ? full - footer.offsetHeight : full;

      let last = 0;
      const parts: string[] = [];
      for (const s of STOPS) {
        let y = place(s);
        if (y == null) continue;
        y = Math.max(last, Math.min(height, y)); // stops never run backwards
        last = y;
        parts.push(`${s.colour} ${Math.round(y)}px`);
      }

      const max = Math.max(0, root.scrollHeight - vh);
      const reduced = reducedQuery.matches || root.dataset.motion === 'reduced';
      // A glow meant to sit at page y while that part is mid-screen (scrollY = y - vh/2) is placed at
      // y - k * scrollY, since the scroll timeline will have pushed it down by k * scrollY by then.
      const glows = GLOWS.map(g => {
        const t = edge(g.at), b = edge(`${g.at}/`);
        if (t == null || b == null) return { top: -9999 };
        const y = t + (b - t) * g.f;
        const at = Math.min(max, Math.max(0, y - vh / 2));
        return { top: Math.round(reduced ? y : y - g.k * at) };
      });
      const dayTop = Math.max(0, Math.round(edge('#top/') ?? 0));
      const swap = Math.round(place(SWITCH) ?? height * 0.7);
      const stars = Math.round(edge('#island') ?? height - vh);
      setLayout({
        height: Math.round(height), ramp: `linear-gradient(to bottom, ${parts.join(', ')})`, glows, travel: max, reduced,
        day: { top: dayTop, bottom: Math.max(0, Math.round(height) - swap - FADE / 2) },
        night: { top: Math.max(dayTop, swap - FADE / 2) },
        stars,
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };

    // Sections change height as pieces load (pins, images, the phones' stage): watch main itself.
    const ro = new ResizeObserver(schedule);
    ro.observe(main);
    window.addEventListener('resize', schedule);
    reducedQuery.addEventListener('change', schedule);
    const motionWatch = new MutationObserver(schedule);
    motionWatch.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
    schedule();
    return () => {
      ro.disconnect(); motionWatch.disconnect();
      window.removeEventListener('resize', schedule);
      reducedQuery.removeEventListener('change', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  const style = layout ? ({ height: layout.height, backgroundImage: layout.ramp, '--travel': `${layout.travel}px`, '--fade': `${FADE}px` } as CSSProperties) : undefined;

  return (
    <div ref={ref} className="ground" aria-hidden="true" style={style} data-ready={layout ? '' : undefined}>
      {layout && GLOWS.map((g, i) => (
        <span key={i} className="ground-glow" style={{ top: layout.glows[i].top, left: g.x, width: g.size, '--c': g.colour, '--k': layout.reduced ? 0 : g.k } as CSSProperties} />
      ))}
      {layout && <div className="ground-stars" style={{ top: layout.stars }} />}
      {layout && (
        <>
          <div className="ground-lines" data-tone="day" style={{ top: layout.day.top, bottom: layout.day.bottom }}>
            <div className="ground-lines-pane"><AfterLoad><ContourCanvas /></AfterLoad></div>
          </div>
          <div className="ground-lines" data-tone="night" style={{ top: layout.night.top }}>
            <div className="ground-lines-pane"><AfterLoad><ContourCanvas /></AfterLoad></div>
          </div>
        </>
      )}
    </div>
  );
}
