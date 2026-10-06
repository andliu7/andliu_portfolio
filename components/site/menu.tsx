'use client';
import { useEffect, useRef, useState } from 'react';
import {
  A11Y, ABOUT, CONTACT, EXPERIENCE_HEAD, GITHUB, IMAGES, IMPACT, IMPACT_HEAD, ISLAND, JOBS, LINKEDIN,
  MICROCOPY, NAV, PROJECTS, RESUME, TICKET, WORK_HEAD,
} from '@/lib/site';
import { FlipLink } from '@/components/ui/flip-links';
import { freezeScroll } from '@/app/smooth';
import { Switch } from './switch';
import { PillFaces } from './pill-faces';
import { Portrait } from './portrait';
import { TwoVoice } from './type';
import { EVENTS, PREFS, emit, readPref, writePref } from './handoffs';
import { useReducedMotion } from './use-reduced-motion';
import { useFinePointer } from './use-fine-pointer';

// The full-screen menu (SITE-PLAN.md 6.1). Rendered by the header only while open, so on open it
// mounts fresh and on close it is gone. While open: focus is trapped inside, Esc closes and
// returns focus to the menu button, and the page behind cannot scroll.
//
// The links are plain anchors. In-page ones are routed by the director's link delegate
// (app/motion.tsx: far targets go through jumpTo) and #island by the island's own delegate. The
// menu only has to get out of the way first, which it does in a window capture listener: the
// window sees a click before the document does, so the page is unfrozen before either delegate
// scrolls.

type Props = { onClose: (returnFocus: boolean) => void; home: boolean };

export function Menu({ onClose, home }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Lazy initial state: the function runs once on mount, so storage is read once, not per render.
  const [sound, setSound] = useState(() => readPref(PREFS.sound) === '1');
  const [mascot, setMascot] = useState(() => document.documentElement.getAttribute('data-mascot') !== 'off');
  const fine = useFinePointer();
  // Which link the preview shows (an index into NAV); the pointer or focus on a link sets it.
  const [active, setActive] = useState(0);
  const at =(href: string) => (home || !href.startsWith('#') ? href : `/${href}`);

  // Freeze the page and move focus in on open; the cleanup undoes both when the menu unmounts.
  useEffect(() => {
    freezeScroll(true);
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => freezeScroll(false);
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(true); return; }
      if (event.key !== 'Tab') return;
      // The focus trap: Tab past the last control wraps to the first, Shift+Tab the other way.
      const items = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    // Links in the menu, and in the header that stays above it (the wordmark, Visit Blueberry).
    const onLinkClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest('a');
      if (!link || !(panel.contains(link) || link.closest('.site-header'))) return;
      freezeScroll(false); // now, synchronously, before the delegates scroll
      onClose(false);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('click', onLinkClick, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onLinkClick, true);
    };
  }, [onClose]);

  const setMotion = (on: boolean) => {
    const root = document.documentElement;
    if (on) root.removeAttribute('data-motion');
    else root.setAttribute('data-motion', 'reduced');
    writePref(PREFS.motion, on ? 'full' : 'reduced');
  };

  const setSoundPref = (on: boolean) => {
    setSound(on);
    writePref(PREFS.sound, on ? '1' : '0');
  };

  // The berry cursor (components/mascot reads html[data-mascot]). Without a mouse
  // or trackpad there is no mascot at all, so the switch is disabled and says why.
  const setMascotPref = (on: boolean) => {
    setMascot(on);
    const root = document.documentElement;
    if (on) root.removeAttribute('data-mascot');
    else root.setAttribute('data-mascot', 'off');
    writePref(PREFS.mascot, on ? 'on' : 'off');
  };

  const ask = () => {
    onClose(false);
    emit(EVENTS.chatRequest);
  };

  return (
    <div ref={panelRef} id="site-menu" className="menu" role="dialog" aria-modal="true" aria-label={A11Y.menuDialog} data-ground="berry-deep">
      <button type="button" className="menu-btn menu-close" onClick={() => onClose(true)} aria-label={MICROCOPY.close}>
        <span aria-hidden="true" /><span aria-hidden="true" />
      </button>
      <div className="menu-main">
        <nav className="menu-nav" aria-label={MICROCOPY.menu}>
          {NAV.map((item, i) => (
            // onFocus bubbles in React (it listens for focusin), so keyboard focus on the link
            // inside picks the preview just as the pointer does.
            <div key={item.href} className="menu-item" data-active={i === active ? '' : undefined} onPointerEnter={() => setActive(i)} onFocus={() => setActive(i)}>
              <span className="menu-num" aria-hidden="true">{pad(i + 1)}</span>
              <FlipLink href={at(item.href)}>{item.label}</FlipLink>
            </div>
          ))}
        </nav>
        <div className="menu-small">
          <a className="pill pill-berry" href={RESUME} target="_blank" rel="noreferrer"><PillFaces>{MICROCOPY.resume}</PillFaces></a>
          <button type="button" className="pill pill-light" onClick={ask}><PillFaces>{MICROCOPY.ask}</PillFaces></button>
          <a className="pill pill-light" href={GITHUB} target="_blank" rel="noreferrer"><PillFaces>GitHub</PillFaces></a>
          <a className="pill pill-light" href={LINKEDIN} target="_blank" rel="noreferrer"><PillFaces>LinkedIn</PillFaces></a>
        </div>
        <div className="menu-switches">
          <Switch on={!reduced} onChange={setMotion} label={MICROCOPY.motion} />
          <Switch on={sound} onChange={setSoundPref} label={MICROCOPY.sound} />
          <Switch on={mascot && fine} onChange={setMascotPref} label={MICROCOPY.mascot} disabled={!fine} describedBy={fine ? undefined : 'menu-mascot-why'} />
          {!fine && <p id="menu-mascot-why" className="menu-note">{MICROCOPY.mascotNeedsPointer}</p>}
        </div>
      </div>
      <MenuPreview index={active} />
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

// The right half of the menu on wide screens: a preview of whichever link the pointer or focus is
// on, set as three prints stacked on a table (an apricot slab, a berry card holding a picture, and
// a paper card with the section's own head and contents), so the menu has depth and says what is
// behind each word before you go. Every word is that section's own copy from lib/site.ts.
// Decorative (aria-hidden): the links already say where they go.
// Pattern: `key={index}` on the two front cards. A new key makes React mount fresh elements, which
// replays their CSS entrance animation each time the preview changes, with no timers or state.
type Row = { k?: string; v: string };
type Preview = { eyebrow: string; headline: string; rows: readonly Row[]; art?: 'reaction' | 'portrait' };

function previewFor(href: string): Preview {
  switch (href) {
    case '#work':
      return { eyebrow: WORK_HEAD.eyebrow, headline: WORK_HEAD.headline, rows: PROJECTS.map(p => ({ k: p.num, v: p.title })), art: 'reaction' };
    case '#impact':
      return { eyebrow: IMPACT_HEAD.eyebrow, headline: IMPACT_HEAD.headline, rows: IMPACT.map((p, i) => ({ k: pad(i + 1), v: p.title })) };
    case '#experience':
      return { eyebrow: EXPERIENCE_HEAD.eyebrow, headline: EXPERIENCE_HEAD.headline, rows: JOBS.map(j => ({ k: j.when, v: j.org })) };
    case '/about':
      return { eyebrow: ABOUT.eyebrow, headline: ABOUT.title, rows: ABOUT.things.map(t => ({ v: t.title })), art: 'portrait' };
    case '#contact':
      return { eyebrow: CONTACT.eyebrow, headline: CONTACT.headline, rows: CONTACT.links.map(l => ({ v: l.href.startsWith('mailto:') ? CONTACT.email : l.label })) };
    default:
      return { eyebrow: ISLAND.eyebrow, headline: `${ISLAND.titleTop} ${ISLAND.titleBottom}`, rows: [{ v: ISLAND.tagline }, { v: MICROCOPY.islandBelow }] };
  }
}

function MenuPreview({ index }: { index: number }) {
  const preview = previewFor(NAV[index].href);
  const art = IMAGES.bbGrignard;
  return (
    <div className="menu-preview" aria-hidden="true">
      <div className="menu-print menu-print-slab" />
      <div className="menu-print menu-print-art" key={`art-${index}`}>
        {preview.art === 'reaction' && (
          <figure className="menu-art-sheet">
            <img src={art.src} alt="" width={art.w} height={art.h} decoding="async" />
            <figcaption className="caption">{TICKET.title}</figcaption>
          </figure>
        )}
        {preview.art === 'portrait' && <Portrait id="about" sizes="24vw" />}
        {!preview.art && <span className="menu-art-num">{pad(index + 1)}</span>}
      </div>
      <div className="menu-print menu-print-front" key={`front-${index}`} data-ground="paper">
        <span className="eyebrow">{preview.eyebrow}</span>
        <TwoVoice as="p" text={preview.headline} className="menu-preview-head" />
        <ol className="menu-preview-rows">
          {preview.rows.map(row => (
            <li key={row.v}>{row.k && <span className="menu-preview-k">{row.k}</span>}<span>{row.v}</span></li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default Menu;
