'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { MICROCOPY } from '@/lib/site';
import { EVENTS, emit, on } from '@/components/site/handoffs';
import { preserveAnchor } from '@/components/site/jump';
import { isReducedMotion } from '@/components/site/use-reduced-motion';
import { freezeScroll } from '@/app/smooth';
import { PillFaces } from '@/components/site/pill-faces';
import { ChatBerry } from './chat-berry';
import { COPY } from './copy';
import './chat.css';

// The chat dock (SITE-PLAN.md 6.2 and 6.3): the launcher, and the panel's open / close / dock
// state. The conversation itself is in chat-panel.tsx.
//
//  - 1100px and up: the panel overlays the right edge (role="complementary"). "Dock to the side"
//    sets html[data-chat="docked"] and globals.css gives <main> room for it; preserveAnchor keeps
//    the block you were reading at the same height on screen while the column narrows.
//  - Below 1100px: a full-height sheet (role="dialog", aria-modal), the page frozen behind it,
//    focus trapped inside, Esc closes and focus returns to the launcher.
//  - Opening is the god's-eye zoom-out: a view transition in which the page falls away like the
//    island drone rising, the new view is revealed in halftone dots from the launcher, and the
//    panel slides in (CSS in chat.css). Without view transitions, a dotted sweep instead; under
//    reduced motion, a 150ms fade.
//  - html[data-chat] is written only here ("open" or "docked"), so foundation CSS can react.
//  - chat:open / chat:close are emitted for the mascot; chat:request (the menu's "Ask about
//    Andrew") opens; island:active closes, because the game takes the whole screen.
//  - Phones: pulling down at the very top of the page, or swiping down on the header anywhere,
//    opens the panel (Andrew, 2026-10-11). A pill follows the finger and reads "Let go to ask"
//    once the pull is far enough. globals.css turns the browser's own pull-to-refresh off on
//    touch screens so the two never fight, and so a chat opened by a pull asks "Did you mean to
//    reload?" with a Reload page button (Andrew, 2026-10-12). See usePullToAsk below.
//  - The launcher lives in the header's right group (an empty #hdr-ask slot that header.tsx
//    renders), not floating over the page, so it never covers content; it hides and returns with
//    the header's pills as you scroll.

// Pattern: next/dynamic with ssr: false. The panel's code is split into its own file that the
// browser downloads only when asked, and it is never rendered on the server (it needs window).
const ChatPanel = dynamic(() => import('./chat-panel'), { ssr: false });

const WIDE = '(min-width: 1100px)';

// Pattern: useSyncExternalStore, React's way to read a value that lives outside React (here a
// media query) and re-render when it changes.
function subscribeWide(onChange: () => void) {
  const list = window.matchMedia(WIDE);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}
const readWide = () => window.matchMedia(WIDE).matches;
const readWideOnServer = () => false;

const canTransition = () => !isReducedMotion() && typeof document.startViewTransition === 'function';

/** Records the launcher's centre on <html> so the transition and the sweep start from it. */
function markOrigin(launcher: HTMLElement | null) {
  const root = document.documentElement;
  const box = launcher?.getBoundingClientRect();
  root.style.setProperty('--chat-ox', box ? `${Math.round(box.left + box.width / 2)}px` : '100%');
  root.style.setProperty('--chat-oy', box ? `${Math.round(box.top + box.height / 2)}px` : '100%');
}

// How far, in px, the finger has to pull before letting go opens the chat.
const PULL = 72;

/**
 * Pull down to ask, on touch screens. A pull counts when it starts at the very top of the page
 * (scrollY 0) or on the header, moves mostly downward, and nothing else is open (the menu, the
 * chat, the island). It writes the pill's position straight to its style each move, so no React
 * render per frame, and calls `open` on release past PULL.
 */
function usePullToAsk(pillRef: RefObject<HTMLDivElement | null>, open: () => void, openRef: RefObject<boolean>) {
  useEffect(() => {
    const pill = pillRef.current;
    if (!pill || !window.matchMedia('(pointer: coarse)').matches) return;
    const root = document.documentElement;
    const label = pill.querySelector<HTMLElement>('.chat-pull-label');
    let start: { x: number; y: number } | null = null;
    let pull = 0;
    const draw = (px: number) => {
      pull = px;
      const k = Math.min(1, px / PULL);
      pill.style.transform = `translate(-50%, ${Math.round(Math.min(px, PULL * 1.4) * 0.8 - 60)}px)`;
      pill.style.opacity = px > 4 ? String(Math.min(1, k * 1.5)) : '0';
      pill.toggleAttribute('data-ready', px >= PULL);
      if (label) label.textContent = px >= PULL ? MICROCOPY.pullAskGo : MICROCOPY.pullAsk;
    };
    const onStart = (event: TouchEvent) => {
      start = null;
      if (event.touches.length !== 1 || openRef.current || root.dataset.island || document.querySelector('.site-header[data-menu-open], [aria-modal="true"]')) return;
      const onHeader = (event.target as Element | null)?.closest('.site-header');
      if (window.scrollY > 0 && !onHeader) return;
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const onMove = (event: TouchEvent) => {
      if (!start) return;
      const dx = event.touches[0].clientX - start.x, dy = event.touches[0].clientY - start.y;
      if (pull === 0 && (dy < 0 || Math.abs(dx) > dy)) { if (Math.abs(dx) > 8 || dy < -8) start = null; return; } // sideways or up: not a pull
      event.preventDefault(); // the page must not scroll (or rubber-band) under the pull
      draw(Math.max(0, dy));
    };
    const onEnd = () => {
      if (start && pull >= PULL) open();
      start = null;
      draw(0);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false }); // not passive: it may preventDefault
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [pillRef, open, openRef]);
}

export default function ChatDock() {
  const wide = useSyncExternalStore(subscribeWide, readWide, readWideOnServer);
  const [mounted, setMounted] = useState(false); // the panel's code has been asked for
  const [open, setOpen] = useState(false);
  const [docked, setDocked] = useState(false);
  const [sweep, setSweep] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null); // the header's #hdr-ask
  const isDocked = docked && wide; // docking only exists at 1100px and up
  const modal = open && !wide;

  const launcherRef = useRef<HTMLButtonElement>(null);
  // Refs mirror state for the window listeners and the async code below, which would otherwise
  // see the values from the render they were created in. Updated in the layout effect.
  const openRef = useRef(false);
  const dockedRef = useRef(false);
  const busy = useRef(false); // a transition is running; ignore clicks until it ends
  const ready = useRef(false); // the panel has mounted
  const waiters = useRef<Array<() => void>>([]);

  const onReady = useCallback(() => {
    ready.current = true;
    waiters.current.splice(0).forEach(resolve => resolve());
  }, []);

  // Hovering or focusing the launcher starts the download (and mounts the closed panel, which
  // renders nothing), so the first click usually finds the code already here.
  const prefetch = useCallback(() => setMounted(true), []);

  const panelReady = useCallback(() => {
    if (ready.current) return Promise.resolve();
    return new Promise<void>(resolve => {
      waiters.current.push(resolve);
      setMounted(true);
    });
  }, []);

  const openChat = useCallback(async () => {
    if (openRef.current || busy.current) return;
    busy.current = true;
    await panelReady();
    markOrigin(launcherRef.current);
    emit(EVENTS.chatOpen);
    if (canTransition()) {
      const root = document.documentElement;
      root.classList.add('chat-vt', 'chat-vt-open');
      // Pattern: flushSync inside the view transition. The browser takes its "after" snapshot as
      // soon as this callback returns, so React must apply the change now, not in a later batch.
      const transition = document.startViewTransition(() => flushSync(() => setOpen(true)));
      void transition.finished.finally(() => {
        root.classList.remove('chat-vt', 'chat-vt-open');
        busy.current = false;
      });
    } else {
      setOpen(true);
      if (!isReducedMotion()) setSweep(true);
      busy.current = false;
    }
  }, [panelReady]);

  const closeChat = useCallback((returnFocus: boolean) => {
    if (!openRef.current || busy.current) return;
    const shut = () => flushSync(() => { setOpen(false); setDocked(false); });
    const after = () => {
      emit(EVENTS.chatClose);
      if (returnFocus) launcherRef.current?.focus();
    };
    // A docked panel gives <main> its width back as it closes: keep the reader's place, and no
    // view transition (docking never is one, plan 6.3).
    if (dockedRef.current) { preserveAnchor(shut); after(); return; }
    if (!canTransition()) { shut(); after(); return; }
    busy.current = true;
    markOrigin(launcherRef.current);
    const root = document.documentElement;
    root.classList.add('chat-vt', 'chat-vt-close');
    const transition = document.startViewTransition(shut);
    void transition.updateCallbackDone.then(after, after); // the launcher is visible again by then
    void transition.finished.finally(() => {
      root.classList.remove('chat-vt', 'chat-vt-close');
      busy.current = false;
    });
  }, []);

  const closeFromPanel = useCallback(() => closeChat(true), [closeChat]);

  const pullRef = useRef<HTMLDivElement>(null);
  const [pulled, setPulled] = useState(false); // this open came from a pull: offer the reload it replaced
  usePullToAsk(pullRef, useCallback(() => { setPulled(true); void openChat(); }, [openChat]), openRef);
  useEffect(() => { if (!open) setPulled(false); }, [open]);

  const toggleDock = useCallback((next: boolean) => {
    preserveAnchor(() => flushSync(() => setDocked(next)));
  }, []);

  // html[data-chat] and the refs, written before paint (useLayoutEffect), so preserveAnchor and
  // the view transition's snapshot see the page after the change. The cleanup removes the
  // attribute if the dock ever unmounts.
  useLayoutEffect(() => {
    openRef.current = open;
    dockedRef.current = isDocked;
    const root = document.documentElement;
    if (!open) root.removeAttribute('data-chat');
    else root.setAttribute('data-chat', isDocked ? 'docked' : 'open');
    return () => { root.removeAttribute('data-chat'); };
  }, [open, isDocked]);

  // The sheet freezes the page behind it; the effect cleanup unfreezes it when the sheet closes
  // or the window widens past 1100px.
  useEffect(() => {
    if (!modal) return;
    freezeScroll(true);
    return () => freezeScroll(false);
  }, [modal]);

  // Find the header's slot once mounted (the header renders before this dock in app/layout.tsx).
  useEffect(() => { setSlot(document.getElementById('hdr-ask')); }, []);

  // Window events. Each on() returns its unsubscribe, which is the effect's cleanup.
  useEffect(() => {
    const offRequest = on(EVENTS.chatRequest, () => { void openChat(); });
    const offIsland = on(EVENTS.islandActive, detail => { if (detail.active) closeChat(false); });
    return () => { offRequest(); offIsland(); };
  }, [openChat, closeChat]);

  return (
    <>
      {/* Pattern: createPortal. The button is rendered by this component (so its state and refs stay
          here) but placed in the DOM inside the header's slot. */}
      {slot && createPortal(
      <button
        ref={launcherRef}
        type="button"
        className="pill pill-berry chat-launcher"
        aria-label={MICROCOPY.ask}
        aria-expanded={open}
        aria-controls={open ? 'chat-panel' : undefined}
        onClick={() => { void openChat(); }}
        onPointerEnter={prefetch}
        onFocus={prefetch}
      >
        <PillFaces>
          <ChatBerry mood="rest" className="chat-glyph" />
          <span className="chat-launcher-label" aria-hidden="true">{COPY.askShort}</span>
        </PillFaces>
      </button>,
      slot)}
      <div className="chat-pull" ref={pullRef} aria-hidden="true">
        <ChatBerry mood="rest" className="chat-glyph" />
        <span className="chat-pull-label">{MICROCOPY.pullAsk}</span>
      </div>
      {pulled && open && (
        <div className="chat-reload" role="status">
          <span>{MICROCOPY.pullReload}</span>
          <button type="button" className="chat-reload-go" onClick={() => window.location.reload()}>{MICROCOPY.pullReloadGo}</button>
          <button type="button" className="chat-reload-x" aria-label={MICROCOPY.pullReloadDismiss} onClick={() => setPulled(false)}>×</button>
        </div>
      )}
      {sweep && <div className="chat-sweep" aria-hidden="true" onAnimationEnd={() => setSweep(false)} />}
      {mounted && (
        <ChatPanel
          open={open}
          modal={modal}
          wide={wide}
          docked={isDocked}
          onDock={toggleDock}
          onClose={closeFromPanel}
          onReady={onReady}
        />
      )}
    </>
  );
}
