// Every cross-section contract on the page, by name, so no two files can spell one differently.
// SITE-PLAN.md 1.5. Integration verifies these; it does not wire anything new.

// ---------------------------------------------------------------------------------------------
// NOTCH_TO_ISLAND: the footer card's tab hangs down and the island window grows out of it.
// The same values are written as CSS custom properties on :root in app/globals.css
// (--notch-w, --notch-h, --notch-r, --notch-fill, --card-r). Use the variables in CSS; use these
// constants in scripts and checks.
// ---------------------------------------------------------------------------------------------

export const NOTCH_TO_ISLAND = {
  width: 'clamp(168px, 22cqi, 288px)', // --notch-w, measured against <main>, which is a container
  height: 28, // --notch-h, px
  radius: 14, // --notch-r, px: the outer radius where the tab meets the card
  fill: 'var(--berry-deep)', // --notch-fill
  cardRadius: 28, // --card-r, px
  vars: { width: '--notch-w', height: '--notch-h', radius: '--notch-r', fill: '--notch-fill', cardRadius: '--card-r' },
  out: 'notch-out', // data-handoff on the footer card's tab (contact piece)
  in: 'notch-in', // data-handoff on the island window (island piece)
  tolerancePx: 1, // integration: |out.bottom - in.top| and |out.width - in.width| at most this
  checkWidths: [390, 1280, 1440],
} as const;

// ---------------------------------------------------------------------------------------------
// Window events (plan 1.5). Fire with emit(); listen with on(). Sections only emit; none imports
// mascot or chat code, so if a listener is not loaded the event simply falls on the floor.
// ---------------------------------------------------------------------------------------------

export type Mood = 'cheer' | 'shy' | 'curious' | 'happy';

// Each event name with the type of its `detail`. `undefined` means no payload.
export type EventMap = {
  'chat:open': undefined; // chat, when its panel opens; the mascot flies over to read
  'chat:close': undefined; // chat, when it closes
  'island:active': { active: boolean }; // island; chat undocks and closes, the mascot hides
  'mascot:peek': { x: number; y: number } | null; // projects, blueberry; a viewport point to look at, null ends it
  'mascot:mood': { mood: Mood; ms?: number }; // impact (cheer), contact (shy), blueberry (curious)
  // Foundation-internal, not in the plan's table:
  'chat:request': undefined; // the menu's "Ask about Andrew"; chat opens its panel
  'jump:end': undefined; // jump.ts after a long jump lands; NearViewport re-checks
};

export type EventName = keyof EventMap;

export const EVENTS = {
  chatOpen: 'chat:open',
  chatClose: 'chat:close',
  islandActive: 'island:active',
  mascotPeek: 'mascot:peek',
  mascotMood: 'mascot:mood',
  chatRequest: 'chat:request',
  jumpEnd: 'jump:end',
} as const satisfies Record<string, EventName>;

/** emit('mascot:mood', { mood: 'cheer' }). TypeScript checks the payload against EventMap. */
export function emit<K extends EventName>(name: K, ...detail: EventMap[K] extends undefined ? [] : [EventMap[K]]) {
  window.dispatchEvent(new CustomEvent(name, { detail: detail[0] }));
}

/** Listen for one event; returns the unsubscribe function (use it as an effect cleanup). */
export function on<K extends EventName>(name: K, handler: (detail: EventMap[K]) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<EventMap[K]>).detail);
  window.addEventListener(name, listener);
  return () => window.removeEventListener(name, listener);
}

// ---------------------------------------------------------------------------------------------
// Attributes on <html>, each with exactly one writer.
// ---------------------------------------------------------------------------------------------

export const ATTRS = {
  section: { name: 'data-section', writer: 'components/site/section-state.ts', readBy: 'header label, CSS' },
  ground: { name: 'data-ground', writer: 'components/site/section-state.ts', readBy: 'header label, CSS' },
  jumping: { name: 'data-jumping', writer: 'components/site/jump.ts', readBy: 'NearViewport, director' },
  motion: { name: 'data-motion', value: 'reduced', writer: 'BOOT script (app/layout.tsx) and the menu Motion switch', readBy: 'section CSS, useReducedMotion()' },
  mascot: { name: 'data-mascot', value: 'off', writer: 'BOOT script (app/layout.tsx) and the menu mascot switch', readBy: 'mascot slot, CSS' },
  chat: { name: 'data-chat', values: ['open', 'docked'], writer: 'components/chat', readBy: 'app/globals.css' },
  island: { name: 'data-island', value: 'active', writer: 'app/sections/island', readBy: 'app/globals.css (hides the chat launcher), mascot' },
  loader: { name: 'data-loader', value: 'skip', writer: 'BOOT script (app/layout.tsx)', readBy: 'app/globals.css' },
} as const;

// ---------------------------------------------------------------------------------------------
// Stored preferences. All are read and written inside try/catch: storage can throw (private
// windows, blocked site data) and a throw must never break the page.
// ---------------------------------------------------------------------------------------------

export const PREFS = {
  motion: 'andliu:motion', // 'reduced' or 'full'; absent means "follow the OS setting"
  sound: 'andliu:sound', // '1' or '0'; absent means off. The island piece reads it.
  seen: 'andliu:seen', // sessionStorage: the loader has played in this tab
  // 'off' or 'on'; absent means on (where there is a fine pointer). Renamed from 'andliu:mascot'
  // when the berry became the cursor (2026-10-06), so an 'off' left by an old test run or the old
  // follower is not carried over: every fine-pointer visitor starts with the berry cursor on.
  mascot: 'andliu:cursor',
} as const;

export function readPref(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function writePref(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* storage blocked: the switch still works for this visit */ }
}

// The island piece calls this inside the "Yes, drive" click.
export function soundOn(): boolean {
  return readPref(PREFS.sound) === '1';
}
