'use client';
import type { KeyboardEvent } from 'react';
import './clock-switch.css';

// The ON / OFF switch for "THE CLOCK", moved here from the manifesto's ForkSwitch
// (app/sections/manifesto.client.tsx) when Off the clock became the evening strip. Just the
// switch now: the caller owns the state and decides what a flip does (Off the clock jumps the
// strip to its start on ON and to its end on OFF).
//
// It follows components/site/switch.tsx: role="switch", aria-checked, a real <button>, so Space
// and Enter click it. The arrow keys also set it (left is on, right is off, where each word sits).
// Pattern: a controlled component. It holds no state; `on` comes in as a prop and every flip goes
// out through onChange, so the parent stays the one source of truth.

type Props = {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string; // the word beside the switch, "THE CLOCK"
  onWord: string;
  offWord: string;
  id: string;
  className?: string;
};

export function ClockSwitch({ on, onChange, label, onWord, offWord, id, className = '' }: Props) {
  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); onChange(true); }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); onChange(false); }
  };
  return (
    <div className={`clock-switch ${className}`}>
      <span className="cs-label" id={id}>{label}</span>
      <button type="button" role="switch" aria-checked={on} aria-labelledby={id} className="cs-sw" onClick={() => onChange(!on)} onKeyDown={onKey}>
        <span className="cs-word" aria-hidden="true">{onWord}</span>
        <span className="cs-word" aria-hidden="true">{offWord}</span>
        <span className="cs-knob" aria-hidden="true" />
      </button>
    </div>
  );
}
