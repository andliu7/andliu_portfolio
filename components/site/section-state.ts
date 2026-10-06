import type { Ground, SectionId } from '@/lib/site';

// The one writer of html[data-section] and html[data-ground] (SITE-PLAN.md 1.4).
//
// The director (app/motion.tsx) is the only caller of setSection(): one ScrollTrigger per
// `main section[id][data-ground]` reports the section crossing the 55% line. The header's centre
// label subscribes. While a long jump is in flight (html[data-jumping], set by jump.ts) the
// writes wait, and jump.ts calls resyncSection() once it lands, so nothing flickers through the
// sections passed on the way.
//
// Pattern: a plain module with module-level state. Every client component that imports this
// file shares the same variables, so no React context is needed. Listeners subscribe for changes.

type Listener = (id: SectionId | null, ground: Ground | null) => void;

let current: SectionId | null = null;
let ground: Ground | null = null;
const listeners = new Set<Listener>();
let resync: (() => void) | null = null;

function jumping() {
  return document.documentElement.hasAttribute('data-jumping');
}

export function getSection(): SectionId | null {
  return current;
}

export function getGround(): Ground | null {
  return ground;
}

// Writes the attributes and tells the listeners, unless a long jump is in flight.
function apply() {
  if (typeof document === 'undefined' || jumping()) return;
  const root = document.documentElement;
  if (current) root.setAttribute('data-section', current);
  if (ground) root.setAttribute('data-ground', ground);
  listeners.forEach(listener => listener(current, ground));
}

/** Director only: a section crossed the 55% line, so its id and ground apply. */
export function setSection(id: SectionId, nextGround: Ground) {
  if (id === current && nextGround === ground) return;
  current = id;
  ground = nextGround;
  apply();
}

/** Director only: registers the function that re-reads which section is under the 55% line. */
export function registerResync(fn: (() => void) | null) {
  resync = fn;
}

/** jump.ts calls this after a jump lands (data-jumping already removed). */
export function resyncSection() {
  if (resync) resync();
  apply();
}

/** For the header label. Returns the unsubscribe function (use it as an effect cleanup). */
export function subscribeSection(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
