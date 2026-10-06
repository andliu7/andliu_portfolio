'use client';
import { useSyncExternalStore } from 'react';

// True when html[data-motion="reduced"] is present. The BOOT script in app/layout.tsx sets that
// attribute from the OS setting or the stored Motion preference, and the menu's Motion switch
// toggles it, so this one attribute is the whole truth about reduced motion on the site.
// CSS reads the same attribute (never the media query directly).
//
// Pattern: a custom hook (a function whose name starts with "use", so it may call hooks).
// It uses useSyncExternalStore, React's way to read a value that lives outside React (here an
// attribute on <html>) and re-render when it changes. A MutationObserver reports the changes.

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  return () => observer.disconnect();
}

function read() {
  return document.documentElement.getAttribute('data-motion') === 'reduced';
}

// The server has no <html> to read; it renders the full-motion markup, which is also correct
// HTML for the reduced case (reduced only removes movement, never content).
function readOnServer() {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, readOnServer);
}

/** The same check outside React (in effects, gsap callbacks, plain modules). */
export function isReducedMotion(): boolean {
  return typeof document !== 'undefined' && read();
}
