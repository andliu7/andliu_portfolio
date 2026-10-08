'use client';
import { useSyncExternalStore } from 'react';
import { Pause, Play } from 'lucide-react';
import { STRIP } from '@/lib/site';
import { readPref, writePref } from './handoffs';
import { isReducedMotion } from './use-reduced-motion';
import './strip-autoplay.css';

// Auto-play for the two pinned horizontal strips (Experience's timeline, Off the clock's evening).
// Andrew 2026-10-07: "make it animate through on default but you can turn it off by clicking a
// red 3D button (turns green)". One setting for both strips, remembered in localStorage.
// The animation itself lives in use-horizontal-scroll.ts (it owns the strip's runway); this file
// holds the shared on/off setting and the button that flips it.
//
// The setting: 'on' or 'off' under PREF; absent means on, except under reduced motion (off).
// Under reduced motion the strips do not pin at all, so there is nothing to auto-play anyway.

const PREF = 'andliu:strip-auto';
const listeners = new Set<() => void>();

export function autoplayOn(): boolean {
  const stored = readPref(PREF);
  return stored ? stored === 'on' : !isReducedMotion();
}

export function setAutoplay(on: boolean) {
  writePref(PREF, on ? 'on' : 'off');
  listeners.forEach(fn => fn());
}

export function subscribeAutoplay(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// Pattern: useSyncExternalStore reads a value that lives outside React (here localStorage plus a
// listener set) and re-renders every button showing it when it changes. The server says off.
export function useAutoplay(): boolean {
  return useSyncExternalStore(subscribeAutoplay, autoplayOn, () => false);
}

// The Duolingo-style 3D button: a solid ink lip under a bright face that sinks onto it when
// pressed. Red while auto-play is on (tap to stop), green once it is off (tap to play).
export function AutoplayButton({ className = '' }: { className?: string }) {
  const on = useAutoplay();
  const Icon = on ? Pause : Play;
  return (
    <button type="button" className={`sa-btn ${className}`} data-on={on ? '' : undefined} onClick={() => setAutoplay(!on)}>
      <Icon size={16} aria-hidden="true" strokeWidth={2.6} />
      <span>{on ? STRIP.autoOn : STRIP.autoOff}</span>
    </button>
  );
}

// The small "Esc to skip" note shown in each strip (hidden on touch-only screens, no Esc key).
export function EscHint({ className = '' }: { className?: string }) {
  return <span className={`sa-esc ${className}`}>{STRIP.esc}</span>;
}
