'use client';
import type { ReactNode } from 'react';

// "Email me" on the contact page (Andrew 2026-11-11: "the email me button should just open the
// popup"). It used to be a mailto link, which opens whatever mail app the visitor's computer has
// set up, often none. Now it asks the letter (contact-form.tsx) to open its full version: the form
// listens for this event on the window. A small client component so the section around it can stay
// a server component. The address itself is still a mailto link, just under the buttons.

export const OPEN_LETTER = 'cf:open';

export function OpenLetter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} aria-haspopup="dialog" onClick={() => window.dispatchEvent(new Event(OPEN_LETTER))}>
      {children}
    </button>
  );
}

export default OpenLetter;
