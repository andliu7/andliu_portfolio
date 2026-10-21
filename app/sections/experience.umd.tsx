'use client';
import { useSyncExternalStore, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { UMD } from '@/lib/site';
import { TiltFrame } from '@/components/site/tilt-frame';
import { SweatyTerrapin } from '@/components/site/umd/sweaty-terrapin';
import { LavaCard } from '@/components/site/umd/lava-card';
import { MarylandFlag } from '@/components/site/umd/flag';
import { MarylandIcon } from '@/components/site/umd/maryland-icon';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// UMD, the first stop on the Experience timeline (Andrew 2026-10-20, choosing between two drafts:
// "having umd be the first one", "flag looks good. maybe make the flag the background", "I also
// really liked how the coursework lifted and tilted on hover. I also liked the listed out courses
// and the font", "shrink coursework card slightly so it fits", "bring the little chips to the
// bottom empty space"). One stop, built like this:
//
//   the panel   the waving Maryland flag (flag.tsx) is its whole ground, under a shade
//   Coursework  a smaller card on the flag: the Lava fire ground under its scrim, the date chip,
//               the heading, the degree, and the courses as cream pills. It lifts and tilts on hover
//   the foot    the club pills straight on the flag (the Clubs card is gone), and the cartoon
//               Maryland at the right, tilting toward the pointer
//   terrapin    stands on the panel's top edge at the right (press him and he sweats)
//
// The panel reuses the role cards' parts (.xp-item, .xp-tick, .xp-card, .xp-when, .xp-role,
// .xp-org from experience.css), so it rises onto the track like the others. Its own rules are the
// "UMD stop" block at the end of experience.css.
//
// The flag stays the live WebGL cloth, not a still: it is what Andrew asked for on 2026-10-06 ("an
// animated flowing maryland flag"), it mounts only near the screen and frees its context when far,
// and until its first frame the panel's own UMD red shows under the shade.

// UMD's gold for the tick's dot (the --umd-* tokens live in app/globals.css).
const GOLD = { '--dot': 'var(--umd-gold)', '--i': 0 } as CSSProperties;

// The pills pop in one after another on the site's spring when the stop comes on screen (motion's
// whileInView, an IntersectionObserver underneath).
const LIST = { hidden: {}, shown: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } } };
const PILL = {
  hidden: { opacity: 0, scale: 0.6, y: 10 },
  shown: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 18 } },
};

function Pills({ items, className, label, live }: { items: readonly string[]; className: string; label?: string; live: boolean }) {
  if (!live) return <ul className={className} aria-label={label}>{items.map(item => <li key={item}>{item}</li>)}</ul>;
  return (
    <motion.ul className={className} aria-label={label} variants={LIST} initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.3 }}>
      {items.map(item => <motion.li key={item} variants={PILL}>{item}</motion.li>)}
    </motion.ul>
  );
}

// Whether the page has hydrated, with useSyncExternalStore (React's way to read a value from
// outside React): the server snapshot says false, the client's says true, and React swaps after
// hydration without a mismatch. The store never changes, so subscribe does nothing.
const noop = () => () => {};
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

export function UmdStop() {
  const reduced = useReducedMotion();
  // The server, no JavaScript and reduced motion all get the plain list, so a pill is never left
  // at its hidden start; the popping list swaps in only after hydration with full motion.
  const live = useHydrated() && !reduced;

  return (
    <li className="xp-item xp-umd" data-hs-item="" style={GOLD}>
      <span className="xp-tick" aria-hidden="true">{UMD.place}</span>
      <article className="xp-card xp-umd-panel" aria-labelledby="xp-umd">
        <span className="xp-umd-edge"><SweatyTerrapin label={UMD.sweat} /></span>
        <div className="xp-umd-ground" aria-hidden="true">
          <MarylandFlag className="xp-umd-flag" />
          <div className="xp-umd-shade" />
        </div>
        <div className="xp-umd-course">
          <LavaCard className="xp-umd-lava">
            <span className="xp-when">{UMD.when}</span>
            <h3 className="xp-role" id="xp-umd">{UMD.courseworkLabel}</h3>
            <p className="xp-org">{UMD.degree}, {UMD.schoolShort}</p>
            <Pills className="xp-umd-chips" items={UMD.coursework} live={live} />
          </LavaCard>
        </div>
        <div className="xp-umd-foot">
          <Pills className="xp-umd-tags" items={UMD.tags} label={UMD.clubsLabel} live={live} />
          {/* The cartoon Maryland, tilting toward the pointer (TiltFrame, fine pointer and full motion only). */}
          <TiltFrame className="xp-umd-state" max={14} shift={0} layers={[{ depth: 0, node: <MarylandIcon className="xp-umd-state-svg" /> }]} />
        </div>
      </article>
    </li>
  );
}
