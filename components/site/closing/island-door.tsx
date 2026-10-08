'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { ISLAND, MICROCOPY } from '@/lib/site';
import { getLenis } from '@/app/smooth';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';

// The island poster as a door (Andrew 2026-10-06), in the island finale (app/sections/island.tsx):
// clicking it asks before leaving the page. It is a real link to the game (ISLAND.src), so without
// JavaScript it simply goes there; with JavaScript the click opens a confirm popup instead. The popup
// is components/ui/alert-dialog.tsx (Base UI): it traps focus inside, closes on Esc, and hands focus
// back to the poster on close. Styles are in app/sections/island.css.
// Pattern: a controlled dialog. `open` lives here in state; the dialog reports Esc through
// onOpenChange and the "stay" button sets it false, so this component stays the one source of truth.
// Pattern: children as a slot. The caller passes the <img> in as children, so this stays a door.

export function IslandDoor({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  // Hold the smooth scroller still while the popup is up, so the wheel cannot move the page under it.
  useEffect(() => {
    const lenis = getLenis();
    if (!open || !lenis) return;
    lenis.stop();
    return () => lenis.start();
  }, [open]);

  return (
    <>
      <a className="il-door" href={ISLAND.src} onClick={event => { event.preventDefault(); setOpen(true); }}>
        {children}
      </a>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="il-dialog" data-ground="ink">
          <AlertDialogTitle className="il-dialog-q">{ISLAND.confirm.question}</AlertDialogTitle>
          <AlertDialogDescription className="il-dialog-note">{MICROCOPY.phoneNote}</AlertDialogDescription>
          <div className="il-dialog-actions">
            <a className="pill pill-berry pill-big" href={ISLAND.src}>{ISLAND.confirm.enter}</a>
            <button type="button" className="pill pill-light pill-big" onClick={() => setOpen(false)}>{ISLAND.confirm.stay}</button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
