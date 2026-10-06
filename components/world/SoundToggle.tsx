'use client';
import { useSyncExternalStore } from 'react';
import { sound } from './sound';

// Pattern: useSyncExternalStore reads a store that lives outside React (sound.ts) and
// re-renders this button when it changes. The third argument is the value during
// server rendering, where there is no AudioContext.

export function SoundToggle() {
  const on = useSyncExternalStore(sound.subscribe, sound.isOn, () => false);
  return (
    <button type="button" className="sound-toggle" aria-pressed={on} onClick={() => sound.toggle()}>
      <span className="sound-dot" />
      {on ? 'Sound on' : 'Sound off'}
    </button>
  );
}
