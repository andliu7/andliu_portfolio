'use client';
import { useSyncExternalStore } from 'react';

// True for a mouse or trackpad: `(pointer: fine) and (hover: hover)`. Every pointer-reactive
// effect on the site (name lean, tilt, mascot, floating images) gates on this AND on
// useReducedMotion(), so touch screens never get effects meant for a cursor (SITE-PLAN.md 2.2).
//
// Pattern: useSyncExternalStore, React's way to read a value that lives outside React (here a
// media query) and re-render when it changes. matchMedia's change event reports the changes,
// for example a tablet gaining a trackpad.

const QUERY = '(pointer: fine) and (hover: hover)';

function subscribe(onChange: () => void) {
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

function read() {
  return window.matchMedia(QUERY).matches;
}

// The server cannot know the pointer, so it renders the touch-safe markup (no pointer effects).
function readOnServer() {
  return false;
}

export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribe, read, readOnServer);
}

/** The same check outside React (effects, event handlers, plain modules). */
export function isFinePointer(): boolean {
  return typeof window !== 'undefined' && read();
}
