'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
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
