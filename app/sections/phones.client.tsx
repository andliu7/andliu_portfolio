'use client';
import { useRef, type CSSProperties } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'motion/react';
import { HOVER, type PhoneShot } from '@/lib/site';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// The phone columns (phones.tsx). One scroll progress for the whole gallery, 0 when its top
// enters at the bottom of the screen and 1 when its bottom leaves at the top, mapped to two
// vertical shifts: on the six-across row the two site pages rise and the four game screens
// sink, so neighbours slide past each other (Andrew 2026-10-20, the landonorris.com style
// opposing columns).
//   - One list, one item per phone, in reading order. phones.css picks which items rise or sink
//     and on which screens they move at all (only six across), so the breakpoints live in one
//     place (the CSS).
//   - This file only publishes the two shifts as CSS variables (--rise, --sink) on the list.
//     Each item reads one in `translate`, a percentage of its own height: transform only, no
//     layout reads per frame. Mirrored items read the same variable, so the row stays
//     symmetric (Andrew 2026-10-20: "make sure it's symmetric").
//   - No cutoff (Andrew 2026-10-20: "there is no cuttoff"): nothing clips the list, so the
//     travel is sized to stay inside the section's own bands instead: the sinking phones start
//     raised by at most SINK_FROM, under the head's gap, and end sunk SINK_TO, which the list's
//     bottom pad in phones.css holds (keep the two in step).
//   - The sinking phones travel further than the rising ones (Andrew 2026-10-20: "the middle
//     should move down faster"). The travel is small because the section is short (Andrew
//     2026-10-20: "it should be rather quick"), and the run is the gallery's own height, so the
//     shear starts with the first pixels of scroll.
//   - Lenis eases the real window scroll (app/motion.tsx), so window-based useScroll follows the
//     smoothed position with no extra wiring: no `container`, no second rAF loop.
//   - Reduced motion (and no JavaScript): the variables stop moving (or never arrive), and
//     phones.css holds a still, staggered grid over them.
//
// Pattern: useScroll + useTransform. useScroll gives progress as a MotionValue, useTransform maps
// it to a CSS length, and motion.ul writes it into the style each frame without re-rendering
// React. A MotionValue on a `--name` key is set as a CSS custom property.

// Percent of one phone's height, positive is down.
const RISE_FROM = 4, RISE_TO = -6; // the two site pages: 10 in all
const SINK_FROM = -4, SINK_TO = 10; // the four game screens: 14 in all

// Flat sticker fills for the phone bodies (phones.css [data-fill]), by distance from the
// centre of the six, so the halves of the row match: apricot at the ends, then sky, then
// berry-soft in the middle.
const FILLS = ['apricot', 'sky', 'berry-soft'] as const;
const fillAt = (n: number, count: number) => FILLS[Math.min(n, count - 1 - n) % FILLS.length];

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
              data-fill={fillAt(n, shots.length)}
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
