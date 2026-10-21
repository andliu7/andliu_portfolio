'use client';
import { useRef, type CSSProperties } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'motion/react';
import { HOVER, type PhoneShot } from '@/lib/site';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// The phone columns (phones.tsx). One scroll progress for the whole gallery, 0 when its top
// enters at the bottom of the screen and 1 when its bottom leaves at the top, mapped to two
// vertical shifts: on the three-column grid (two rows of three, Andrew 2026-10-21) the left
// and right columns rise and the centre column sinks, so the centre slides past both sides
// (Andrew 2026-10-20, the landonorris.com style opposing columns).
//   - One list, one item per phone, in reading order. phones.css picks which items rise or sink
//     and on which screens they move at all (only on three columns), so the breakpoints live in
//     one place (the CSS).
//   - This file only publishes the two shifts as CSS variables (--rise, --sink) on the list.
//     Each item reads one in `translate`, a percentage of its own height: transform only, no
//     layout reads per frame. The left and right columns read the same variable, so they move
//     identically and the grid stays symmetric (Andrew 2026-10-21: "I thought I chose the one
//     that said it would be symmetric").
//   - No cutoff (Andrew 2026-10-20: "there is no cuttoff"): nothing clips the list, so the
//     travel is sized to stay inside the section's own bands instead: the centre column ends
//     sunk SINK_TO, which the list's bottom pad in phones.css holds (keep the two in step).
//   - The centre always sits lower than the sides, by more as the page scrolls (Andrew
//     2026-10-21: "stagger them a little bit more"). The old run (sides 4 to -6, centre -4 to
//     12) crossed level about a third of the way in, so the stagger vanished there; starting
//     the centre below the sides keeps it readable at every scroll position. Measured at
//     1440x900, centre minus sides at start/middle/end: -37/43/102px before (the centre still
//     higher at the start), 46/117/170 after.
//   - The centre column travels further than the sides (Andrew 2026-10-20: "the middle should
//     move down faster"). The run is the gallery's own height, so the shear starts with the
//     first pixels of scroll.
//   - Lenis eases the real window scroll (app/motion.tsx), so window-based useScroll follows the
//     smoothed position with no extra wiring: no `container`, no second rAF loop.
//   - Reduced motion (and no JavaScript): the variables stop moving (or never arrive), and
//     phones.css holds a still, staggered grid over them.
//
// Pattern: useScroll + useTransform. useScroll gives progress as a MotionValue, useTransform maps
// it to a CSS length, and motion.ul writes it into the style each frame without re-rendering
// React. A MotionValue on a `--name` key is set as a CSS custom property.

// Percent of one phone's height, positive is down.
const RISE_FROM = 3, RISE_TO = -5; // the left and right columns: 8 in all
const SINK_FROM = 5, SINK_TO = 20; // the centre column (the two site pages): 15 in all

// Flat sticker fills for the phone bodies (phones.css [data-fill]), mirrored across the centre
// column so each row's halves match: sky down the centre (the site pages), apricot on the
// sides of the first row, berry-soft on the sides of the second.
const fillAt = (n: number) => (n % 3 === 1 ? 'sky' : Math.floor(n / 3) % 2 ? 'berry-soft' : 'apricot');

export function PhoneColumns({ shots, label }: { shots: readonly PhoneShot[]; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const rise = useTransform(scrollYProgress, [0, 1], [`${RISE_FROM}%`, `${RISE_TO}%`]);
  const sink = useTransform(scrollYProgress, [0, 1], [`${SINK_FROM}%`, `${SINK_TO}%`]);
  // A cast because motion's style type does not list custom properties, though it sets them.
  const style = (reduced ? undefined : { '--rise': rise, '--sink': sink }) as CSSProperties | undefined;

  return (
    <motion.ul ref={ref} className="ph-cols" aria-label={label} style={style}>
      {shots.map((shot, n) => (
        <li key={shot.src} className="ph-item">
          <figure className="ph-shot">
            {/* Each phone opens its screen on the live site (Andrew 2026-10-20, the hover bubble:
                "focus on what the user can DO with it"). The link's name starts with the same
                action words the bubble shows, then the screenshot's description. */}
            <a
              className="ph-phone"
              data-fill={fillAt(n)}
              href={HOVER.phones[shot.title].href}
              target="_blank"
              rel="noreferrer"
              data-bubble={HOVER.phones[shot.title].text}
              data-bubble-icon={HOVER.phones[shot.title].icon}
            >
              <span className="sr-only">{HOVER.phones[shot.title].text}, </span>
              <span className="ph-island" aria-hidden="true" />
              {/* unoptimized: the export is static, so the WebP is served as captured (a plain img). */}
              <Image src={shot.src} width={shot.w} height={shot.h} alt={shot.alt} unoptimized />
            </a>
            <figcaption className="ph-cap">
              <span className="ph-where">{shot.where}</span> {shot.title}
            </figcaption>
          </figure>
        </li>
      ))}
    </motion.ul>
  );
}

export default PhoneColumns;
