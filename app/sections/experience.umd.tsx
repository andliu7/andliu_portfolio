'use client';
import { useSyncExternalStore, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { UMD } from '@/lib/site';
import { SweatyTerrapin } from '@/components/site/umd/sweaty-terrapin';
import { LavaCard } from '@/components/site/umd/lava-card';
import { MarylandFlag } from '@/components/site/umd/flag';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// UMD, the first stop on the Experience timeline (Andrew 2026-10-20, choosing between two drafts:
// "having umd be the first one", "flag looks good. maybe make the flag the background", "I also
// really liked how the coursework lifted and tilted on hover. I also liked the listed out courses
// and the font", "shrink coursework card slightly so it fits", "bring the little chips to the
// bottom empty space"). One stop, built like this:
//
//   the panel   the waving Maryland flag (flag.tsx) is its whole ground, under a shade
//   Coursework  a smaller card on the flag: the Lava fire ground under its scrim (its date is on the line),
//               the heading, the degree, and the courses as cream pills. It lifts and tilts on hover
//   the foot    the club pills straight on the flag (the Clubs card is gone), and the cartoon
//               Maryland at the right, tilting toward the pointer
//   terrapin    stands on the timeline over the stop (press him and he sweats)
//
// The panel reuses the role cards' parts (.xp-item, .xp-stop, .xp-card, .xp-role, .xp-org from
// experience.css) and is the same .ink-card (2026-11-03): it hangs from its pin on the timeline
// with its expected graduation above the line. Its own rules are the "UMD stop" block at the end
// of experience.css.
//
// The flag stays the live WebGL cloth, not a still: it is what Andrew asked for on 2026-10-06 ("an
// animated flowing maryland flag"), it mounts only near the screen and frees its context when far,
// and until its first frame the panel's own UMD red shows under the shade.

// The panel hangs a little crooked from its pin, like the role cards (experience.tsx TILTS).
const TILT = { '--hang': '-1deg' } as CSSProperties;

// The pills pop in one after another on the site's spring when the stop comes on screen (motion's
// whileInView, an IntersectionObserver underneath).
const LIST = { hidden: {}, shown: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } } };
const PILL = {
  hidden: { opacity: 0, scale: 0.6, y: 10 },
  shown: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 420, damping: 18 } },
};

// `logos` is an optional picture per item (the club pills' logos), drawn before the words; with `links`
// each is a link to that club's Instagram, named by the link's label (the image itself has no alt).
type Link = { href: string; label: string };
function Pills({ items, className, label, live, logos, links }: { items: readonly string[]; className: string; label?: string; live: boolean; logos?: readonly string[]; links?: readonly Link[] }) {
  const logo = (i: number) => {
    if (!logos?.[i]) return null;
    const img = <img className="xp-pill-logo" src={logos[i]} alt="" loading="lazy" decoding="async" />;
    const link = links?.[i];
    return link ? <a className="xp-pill-link" href={link.href} target="_blank" rel="noreferrer" aria-label={link.label}>{img}</a> : img;
  };
  if (!live) return <ul className={className} aria-label={label}>{items.map((item, i) => <li key={item}>{logo(i)}{item}</li>)}</ul>;
  return (
    <motion.ul className={className} aria-label={label} variants={LIST} initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.3 }}>
      {items.map((item, i) => <motion.li key={item} variants={PILL}>{logo(i)}{item}</motion.li>)}
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
    <li className="xp-item xp-umd" data-hs-item="" style={TILT}>
      <div className="xp-stop" aria-hidden="true">
        <span className="xp-pin" data-fill="umd-gold" />
        <span className="xp-date">{UMD.when}</span>
      </div>
      {/* On the line over the stop, like the roles' people (a button: press him and he sweats) */}
      <span className="xp-umd-edge"><SweatyTerrapin label={UMD.sweat} /></span>
      <article className="xp-card ink-card xp-umd-panel" aria-labelledby="xp-umd">
        <div className="xp-umd-ground" aria-hidden="true">
          <MarylandFlag className="xp-umd-flag" />
          <div className="xp-umd-shade" />
        </div>
        <div className="xp-umd-course">
          <LavaCard className="xp-umd-lava">
            <span className="sr-only">{UMD.when}. </span>
            <h3 className="xp-role" id="xp-umd">{UMD.courseworkLabel}</h3>
            <p className="xp-org">{UMD.degree}, {UMD.schoolShort}</p>
            <Pills className="xp-umd-chips" items={UMD.coursework} live={live} />
          </LavaCard>
        </div>
        <div className="xp-umd-foot">
          <Pills className="xp-umd-tags" items={UMD.tags} logos={UMD.tagLogos} links={UMD.tagLinks} label={UMD.clubsLabel} live={live} />
        </div>
      </article>
    </li>
  );
}
