'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { A11Y, BLUEBERRY, MICROCOPY, RESUME, SECTIONS } from '@/lib/site';
import { Mark } from './mark';
import { Menu } from './menu';
import { PillFaces } from './pill-faces';
import { getSection, subscribeSection } from './section-state';

// The fixed header (SITE-PLAN.md 6.1). Every control sits on an opaque surface with the ledge,
// so it is never text on text.
//   left    the AND/LIU mark (components/site/mark.tsx, his handle andliu), which flips on hover
//           like a small FlipHeading and goes home
//   centre  the current section's label in a pill (1200px and up), rolling when it changes; where
//           a section has no label, the centre mark (Blueberry's flat berry) instead
//   right   Résumé (the PDF, a new tab; 720px and up, the menu has it on phones), the berry
//           "Visit Blueberry" pill (the live site, a new tab), Ask (an empty slot that the chat
//           dock fills with its launcher through a portal) and the menu button
// Scrolling down sends the pills up out of the way (so they never sit on the heading you are
// reading); scrolling up, or reaching the top, brings them back. See useHideOnScroll.
// It only renders hrefs: far in-page targets are routed by the director's link delegate
// (app/motion.tsx), #island by the island's own delegate. On About the in-page targets do not
// exist, so the hrefs point at the home page instead.

const LABELS = new Map<string, string | null>(SECTIONS.map(s => [s.id, s.label]));

export function Header() {
  const home = usePathname() === '/';
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // useCallback keeps one stable function across renders, so the menu's key listener effect
  // (which lists onClose as a dependency) does not re-subscribe every time the header renders.
  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  const { hidden, band } = useHideOnScroll();

  return (
    // data-menu-open lifts the wordmark and the Visit Blueberry pill above the open menu, so the
    // header stays put while the menu covers the page (plan 6.1).
    <header className="site-header" data-menu-open={open ? '' : undefined} data-hidden={hidden ? '' : undefined} data-band={band ? '' : undefined}>
      <a className="wordmark flip-head" href={home ? '#top' : '/'} aria-label={A11Y.home}>
        <Mark />
      </a>
      <SectionLabel />
      <div className="header-right">
        <a className="pill pill-light header-resume" href={RESUME} target="_blank" rel="noreferrer">
          <PillFaces>{MICROCOPY.resumeShort}</PillFaces>
        </a>
        <a className="pill pill-berry header-visit" href={BLUEBERRY.live} target="_blank" rel="noreferrer">
          <PillFaces>{MICROCOPY.visitBlueberry} <ArrowUpRight size={18} aria-hidden="true" /></PillFaces>
        </a>
        {/* The chat launcher lands here (chat-dock.tsx, createPortal). display: contents, so the
            launcher is laid out as if it were a direct child of this row. */}
        <span id="hdr-ask" className="hdr-ask" />
        <button
          ref={buttonRef}
          type="button"
          className="menu-btn"
          aria-label={MICROCOPY.menu}
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen(true)}
        >
          <span aria-hidden="true" /><span aria-hidden="true" />
        </button>
      </div>
      {open && <Menu onClose={close} home={home} />}
    </header>
  );
}

// hidden: the header should be out of the way, after scrolling down past the first 120px and
// until the reader scrolls up again. Small moves (under 8px) are ignored, so a trackpad's jitter
// does not flicker it. band: the page has scrolled at all, so the header needs its paper band.
// Read at most once a frame (the requestAnimationFrame guard).
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const [band, setBand] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const check = () => {
      frame = 0;
      const y = window.scrollY;
      setBand(y > 8);
      if (y < 120) setHidden(false);
      else if (y - last > 8) setHidden(true);
      else if (last - y > 8) setHidden(false);
      else return; // too small to count; keep `last` where it was
      last = y;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // a reload part-way down the page starts with the band
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);
  return { hidden, band };
}

// The centre pill. Not a link, not focusable, aria-hidden: the page's landmarks already say
// where you are. When the section changes, the old label rolls up and out while the new one
// rolls in (rolling-list's mechanic): both sit in one track that moves -50%.
// Pattern: `key` on the track. Changing a key makes React drop the old element and mount a new
// one, which restarts the CSS animation without any timer.
function SectionLabel() {
  const [labels, setLabels] = useState<{ now: string | null; was: string | null }>({ now: null, was: null });

  // Subscribe once on mount; the returned unsubscribe is the effect's cleanup.
  useEffect(() => {
    const read = (id: string | null) => (id ? LABELS.get(id) ?? null : null);
    setLabels({ now: read(getSection()), was: null });
    return subscribeSection(id => {
      const next = read(id);
      // Under reduced motion there is no roll (and so no animationend), so keep no old label.
      const still = document.documentElement.getAttribute('data-motion') === 'reduced';
      // The updater form reads the latest state, so a quick run of changes never uses a stale one.
      setLabels(prev => (prev.now === next ? prev : { now: next, was: still ? null : prev.now }));
    });
  }, []);

  const shown = labels.now ?? labels.was;
  const rolling = Boolean(labels.now && labels.was);
  // Once the roll has played, drop the old label, so the pill shrinks to the new label's width
  // and holds one word again.
  const settle = () => setLabels(prev => (prev.was === null ? prev : { now: prev.now, was: null }));
  // Where a section has no label (the hero, the manifesto) the centre holds Lando's centre mark
  // instead: Blueberry's berry, flat, the same one the loader drops. Mark and pill share one grid
  // cell and cross-fade, so the header never jumps.
  return (
    <span className="hdr-centre" aria-hidden="true" data-empty={labels.now ? undefined : ''}>
      <svg className="hdr-mark" viewBox="0 0 100 100" focusable="false">
        <circle cx="50" cy="54" r="40" fill="var(--berry)" />
        <circle cx="36" cy="40" r="9" fill="var(--berry-soft)" opacity=".55" />
        <path d="M50 20l6 -9 3 10 10 -2 -6 8 -13 1 -13 -1 -6 -8 10 2 3 -10z" fill="var(--ink)" />
      </svg>
      <span className="hdr-label">
        {shown && (
          <span key={shown} className="hdr-label-track" data-roll={rolling ? '' : undefined} onAnimationEnd={settle}>
            {rolling && <span className="hdr-label-text">{labels.was}</span>}
            <span className="hdr-label-text">{shown}</span>
          </span>
        )}
      </span>
    </span>
  );
}

export default Header;
