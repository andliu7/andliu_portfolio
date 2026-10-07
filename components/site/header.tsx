'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { A11Y, BLUEBERRY, HERO, MICROCOPY, RESUME, SECTIONS } from '@/lib/site';
import { ChipMarquee } from './chip-marquee';
import { Flame } from './flame/flame';
import { Mark } from './mark';
import { Menu } from './menu';
import { PillFaces } from './pill-faces';
import { getSection, subscribeSection } from './section-state';

// The fixed header (SITE-PLAN.md 6.1). Every control sits on an opaque surface with the ledge,
// so it is never text on text.
//   left    the AND/LIU mark (components/site/mark.tsx, his handle andliu), which flips and
//           dances on hover, focus and once on load, goes home, and burns in a small berry and
//           apricot flame (components/site/flame/); beside it the degree chip, one line, which
//           turns into a slow marquee when the room before the centre is too short (720px and
//           up; a phone shows it in the hero instead)
//   centre  the current section's label in a pill (1200px and up), rolling when it changes; where
//           a section has no label, the centre berry instead, a link back to the top that grows
//           to "ANDLIU.DEV" on hover and keyboard focus
//   right   Résumé (the PDF, a new tab; 720px and up, the menu has it on phones), the berry
//           "Visit Blueberry" pill (the live site, a new tab), Ask (an empty slot that the chat
//           dock fills with its launcher through a portal) and the menu button
// Scrolling down sends the pills up out of the way (so they never sit on the heading you are
// reading); scrolling up, or reaching the top, brings them back. See useHideOnScroll. While they
// are away the section label stays, compact, at the top centre. While a pinned horizontal strip
// runs (html[data-hscroll="on"], set by use-horizontal-scroll.ts) only Ask and the menu button
// stay. Both are CSS only (the header rules in app/globals.css).
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
  const markRef = useRef<HTMLAnchorElement>(null);
  useHello(markRef);

  return (
    // data-menu-open lifts the wordmark and the Visit Blueberry pill above the open menu, so the
    // header stays put while the menu covers the page (plan 6.1).
    <header className="site-header" data-menu-open={open ? '' : undefined} data-hidden={hidden ? '' : undefined} data-band={band ? '' : undefined}>
      {/* The left group is the header's first grid item: the flame's host span (.wordmark-host
          in globals.css) around the mark, then the degree chip */}
      <div className="hdr-left">
        <Flame className="wordmark-host" height={16} spread={7} radius={12}>
          <a ref={markRef} className="wordmark flip-head" href={home ? '#top' : '/'} aria-label={A11Y.home}>
            <Mark />
          </a>
        </Flame>
        {home && <span className="hdr-chip"><ChipMarquee text={HERO.chip} /></span>}
      </div>
      <SectionLabel home={home} />
      <div className="header-right">
        <a className="pill pill-berry header-resume" href={RESUME} target="_blank" rel="noreferrer">
          <PillFaces>{MICROCOPY.resumeShort}</PillFaces>
        </a>
        <a className="pill pill-light header-visit" href={BLUEBERRY.live} target="_blank" rel="noreferrer">
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

// The mark says hello once: when the loader lifts (html.is-loaded), it borrows the director's tap
// state, data-flipped, for 900ms, so the letters roll over and back and the card dances (CSS in
// globals.css). Skipped under reduced motion.
function useHello(ref: RefObject<HTMLAnchorElement | null>) {
  useEffect(() => {
    const d = document.documentElement;
    let timer = 0;
    const play = () => {
      const el = ref.current;
      if (!el || d.getAttribute('data-motion') === 'reduced') return;
      el.setAttribute('data-flipped', '');
      timer = window.setTimeout(() => el.removeAttribute('data-flipped'), 900);
    };
    const start = () => { timer = window.setTimeout(play, 350); };
    if (d.classList.contains('is-loaded')) { start(); return () => window.clearTimeout(timer); }
    // Not loaded yet: watch <html>'s class list until is-loaded lands, then play once.
    const mo = new MutationObserver(() => {
      if (!d.classList.contains('is-loaded')) return;
      mo.disconnect();
      start();
    });
    mo.observe(d, { attributes: true, attributeFilter: ['class'] });
    return () => { mo.disconnect(); window.clearTimeout(timer); };
  }, [ref]);
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
// where you are. Where there is no label, the berry instead, which is a real link to the top. When the section changes, the old label rolls up and out while the new one
// rolls in (rolling-list's mechanic): both sit in one track that moves -50%.
// Pattern: `key` on the track. Changing a key makes React drop the old element and mount a new
// one, which restarts the CSS animation without any timer.
function SectionLabel({ home }: { home: boolean }) {
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
  // instead: Blueberry's berry, flat, the same one the loader drops, as a pill-shaped link to the
  // top whose "ANDLIU.DEV" slides out on hover and focus (the SocialButton pattern, globals.css
  // .hdr-berry). Berry and pill share one grid cell and cross-fade, so the header never jumps.
  // While a label shows, the berry is faded out, so it also leaves the tab order and the
  // accessibility tree (tabIndex -1, aria-hidden).
  const away = Boolean(labels.now);
  return (
    <span className="hdr-centre" data-empty={away ? undefined : ''}>
      <a className="hdr-berry" href={home ? '#top' : '/'} aria-label={A11Y.berryHome} tabIndex={away ? -1 : undefined} aria-hidden={away ? true : undefined}>
        <svg className="hdr-mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <circle cx="50" cy="54" r="40" fill="var(--berry)" />
          <circle cx="36" cy="40" r="9" fill="var(--berry-soft)" opacity=".55" />
          <path d="M50 20l6 -9 3 10 10 -2 -6 8 -13 1 -13 -1 -6 -8 10 2 3 -10z" fill="var(--ink)" />
        </svg>
        <span className="hdr-berry-text" aria-hidden="true">{MICROCOPY.domain}</span>
      </a>
      <span className="hdr-label" aria-hidden="true">
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
