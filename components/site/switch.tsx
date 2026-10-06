'use client';

// Ported from Blueberry: the Switch function in grignard-app-source/src/components/EntryGate.tsx
// (role="switch", aria-checked, the soft ledge press). Same behaviour, Stage tokens instead of
// Blueberry's system-window colours, and the label is visible text inside the button so the
// whole row is the 44px target. CSS: .switch in app/globals.css.
//
// It is a "controlled" component: it never stores whether it is on. The parent owns `on` and
// passes onChange; the switch only reports clicks. That keeps one source of truth.

export function Switch({ on, onChange, label, disabled = false, describedBy }: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  /** The id of an element that explains the switch (for example why it is disabled). */
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      aria-describedby={describedBy}
      className="switch press-soft"
      onClick={() => onChange(!on)}
    >
      <span className="switch-label">{label}</span>
      <span className="switch-track" aria-hidden="true"><span className="switch-knob" /></span>
    </button>
  );
}

export default Switch;
