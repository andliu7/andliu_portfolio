'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  A11Y, ABOUT, CONTACT, EXPERIENCE_HEAD, GITHUB, IMPACT, IMPACT_HEAD, ISLAND, JOBS, LINKEDIN,
  MICROCOPY, NAV, PROJECTS, WORK_HEAD,
} from '@/lib/site';
import { FlipLink } from '@/components/ui/flip-links';
import { freezeScroll } from '@/app/smooth';
import { Switch } from './switch';
import { Portrait } from './portrait';
import { TwoVoice } from './type';
import { EVENTS, PREFS, on, readPref, writePref } from './handoffs';
import { useReducedMotion } from './use-reduced-motion';
import { useFinePointer } from './use-fine-pointer';
import { SocialButton } from './social-button';
import { FlashcardSticker } from './stickers/stickers';

// The full-screen menu (SITE-PLAN.md 6.1). Rendered by the header only while open, so on open it
// mounts fresh and on close it is gone. While open: focus is trapped inside, Esc closes and
// returns focus to the menu button, and the page behind cannot scroll.
//
// The links are plain anchors. In-page ones are routed by the director's link delegate
// (app/motion.tsx: far targets go through jumpTo) and #island by the island's own delegate. The
// menu only has to get out of the way first, which it does in a window capture listener: the
// window sees a click before the document does, so the page is unfrozen before either delegate
// scrolls.
//
// Opening and closing are a clip-path circle reveal (Andrew, 2026-10-06: "expand from the button to
// the full screen"): the panel is clipped to a circle centred on the menu button, grown from 0 to
// the distance to the farthest screen corner, so it covers every pixel at the end. Closing plays
// the circle back down into the button, and only then tells the header to unmount the menu.
// Reduced motion: no circle, the menu appears and goes at once.

const REVEAL_MS = 600;
const CONCEAL_MS = 420;
const WIPE_EASE = 'cubic-bezier(.76,0,.24,1)'; // --ease-wipe in app/globals.css

/** The circle's two ends, from the header's menu button (which stays put while the menu is open). */
function circleFromButton(): [string, string] {
  const box = document.querySelector<HTMLElement>('[aria-controls="site-menu"]')?.getBoundingClientRect();
  const w = window.innerWidth;
  const h = window.innerHeight;
  const x = box ? box.left + box.width / 2 : w - 40;
  const y = box ? box.top + box.height / 2 : 40;
  const r = Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y)));
  return [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`];
}

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
  // Refs, not state: the running animation and the closing flag must not re-render anything.
  const animRef = useRef<Animation | null>(null);
  const closingRef = useRef(false);

  // The reveal. useLayoutEffect runs after the DOM exists but before the browser paints, so the
  // first frame is already the 0px circle and the full menu never flashes.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || reduced || !panel.animate) return;
    const [from, to] = circleFromButton();
    const anim = panel.animate([{ clipPath: from }, { clipPath: to }], { duration: REVEAL_MS, easing: WIPE_EASE });
    animRef.current = anim;
    return () => anim.cancel();
    // Only on mount: the reveal plays once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every way out comes through here. It plays the circle back into the button (reversing the
  // reveal if that is still running), then lets the header unmount the menu.
  // useCallback keeps it stable, so the key listener effect below does not re-subscribe.
  const requestClose = useCallback((returnFocus: boolean) => {
    if (closingRef.current) return;
    closingRef.current = true;
    const panel = panelRef.current;
    if (!panel || reduced || !panel.animate) { onClose(returnFocus); return; }
    let anim = animRef.current;
    if (anim && anim.playState === 'running') {
      anim.effect?.updateTiming({ fill: 'both' }); // hold the 0px circle at the end, no flash
      anim.reverse();
    } else {
      const [from, to] = circleFromButton();
      anim = panel.animate([{ clipPath: to }, { clipPath: from }], { duration: CONCEAL_MS, easing: WIPE_EASE, fill: 'forwards' });
      animRef.current = anim;
    }
    // flushSync: an animation's finish event is not a React event, so React would commit the
    // unmount later, after the header's next-frame focus call, while the menu button is still
    // hidden behind the open menu and cannot take focus. This commits the close right here.
    anim.onfinish = () => flushSync(() => onClose(returnFocus));
  }, [onClose, reduced]);

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
      if (event.key === 'Escape') { event.preventDefault(); requestClose(true); return; }
      if (event.key !== 'Tab') return;
      // The focus trap: Tab past the last control wraps to the first, Shift+Tab the other way.
      // The header's Résumé, which stays beside the close button, comes first (it is first in the DOM).
      const items = Array.from(document.querySelectorAll<HTMLElement>('.site-header .header-resume, #site-menu a[href], #site-menu button:not([disabled])'));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    // Links in the menu, and in the header that stays above it (Résumé).
    const onLinkClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest('a');
      if (!link || !(panel.contains(link) || link.closest('.site-header'))) return;
      freezeScroll(false); // now, synchronously, before the delegates scroll
      requestClose(false);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('click', onLinkClick, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onLinkClick, true);
    };
  }, [requestClose]);

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

  // Ask hides while the menu is open, but the chat can still be asked for (EVENTS.chatRequest). When it opens,
  // close the menu straight away (no circle): the chat panel takes focus, and a menu still
  // shrinking over it would hold its focus trap a moment longer. on() returns its unsubscribe, which
  // is this effect's cleanup.
  useEffect(() => on(EVENTS.chatOpen, () => {
    closingRef.current = true;
    onClose(false);
  }), [onClose]);

  return (
    <div ref={panelRef} id="site-menu" className="menu" role="dialog" aria-modal="true" aria-label={A11Y.menuDialog} data-ground="berry-deep">
      <button type="button" className="menu-btn menu-close" onClick={() => requestClose(true)} aria-label={MICROCOPY.close}>
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
          {/* Résumé and Ask stay in the header's top right while the menu is open (Andrew, 2026-10-07),
              so the menu no longer repeats them here. */}
          <SocialButton className="pill pill-light" href={GITHUB} label="GitHub" kind="github" />
          <SocialButton className="pill pill-light" href={LINKEDIN} label="LinkedIn" kind="linkedin" />
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
type Preview = { eyebrow: string; headline: string; rows: readonly Row[]; art?: 'card' | 'portrait' };

function previewFor(href: string): Preview {
  switch (href) {
    case '#work':
      return { eyebrow: WORK_HEAD.eyebrow, headline: WORK_HEAD.headline, rows: PROJECTS.map(p => ({ k: p.num, v: p.title })), art: 'card' };
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
  return (
    <div className="menu-preview" aria-hidden="true">
      <div className="menu-print menu-print-slab" />
      <div className="menu-print menu-print-art" key={`art-${index}`}>
        {preview.art === 'card' && <FlashcardSticker className="menu-art-sticker" />}
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
