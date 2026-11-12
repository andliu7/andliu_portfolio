'use client';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { NearViewport } from '@/components/site/near-viewport';
import { useReducedMotion } from '@/components/site/use-reduced-motion';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { getLenis } from '@/app/smooth';
import { SKYLINE } from '@/lib/site';
import './commit-skyline.css';

// The commits-per-day chart, as a scrub strip in a small .ink-card in the Projects head's top
// right corner (Andrew 2026-11-11: the strip from variant B, the corner from variant A and the
// "open as a popup" button from variant C). The strip (a canvas heat map whose weeks rise under
// the pointer) is its own lazy chunk, mounted near the viewport. It draws the card's header line
// itself, because the line's right half is its live readout. Under it, the caption and an Open
// button: the button opens the same strip, larger, in a dialog (components/ui/dialog.tsx, Base
// UI): focus is trapped inside, Esc, an outside press and the close button all close it, and
// focus goes back to the button. `open` lives here, as in closing/island-door.tsx.

const Skyline = lazy(() => import('@/components/ui/contribution-skyline'));
// The popup's chart: the same days as a flat grid that folds up into a city as it opens (the 2D to
// 3D morph, Andrew 2026-11-11), and can then be dragged round. Loaded only when the popup opens.
const City = lazy(() => import('@/components/ui/contribution-skycity'));

type Props = { points: { x: string; y: number }[]; unit: string; title: string; caption: string };

export function CommitSkyline({ points, unit, title, caption }: Props) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  // Hold the smooth scroller still while the dialog is up, so the wheel cannot move the page under it.
  useEffect(() => {
    const lenis = getLenis();
    if (!open || !lenis) return;
    lenis.stop();
    return () => lenis.start();
  }, [open]);

  const placeholder = <div className="skc-ph" aria-hidden="true" />;
  return (
    // A press anywhere on the card opens the popup (Andrew 2026-11-11). React hands the popup's own
    // clicks up to this figure too, although it is drawn elsewhere in the page, so only a press that
    // is really inside the card counts. Keyboard users have the Open button.
    <figure className="skc ink-card" data-ground="paper" onClick={event => { if (event.currentTarget.contains(event.target as Node)) setOpen(true); }}>
      <NearViewport placeholder={placeholder} margin="100%">
        <Suspense fallback={placeholder}>
          <Skyline points={points} unit={unit} reduced={reduced} labels={SKYLINE} title={title} />
        </Suspense>
      </NearViewport>
      <figcaption className="sr-only">{caption}</figcaption>
      {/* In the card's top right corner, clear of the fan's cards, which pass over the card's foot. */}
      <button ref={opener} type="button" className="skc-open" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        {SKYLINE.open} <Maximize2 size={14} aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="skc-dialog" data-ground="paper" showCloseButton={false} finalFocus={opener}>
          <div className="skc-head">
            <DialogTitle className="skc-title">{title}</DialogTitle>
            <DialogDescription className="skc-cap">{caption}</DialogDescription>
          </div>
          <Suspense fallback={<div className="impact-chart impact-chart-days skc-ph" aria-hidden="true" />}>
            <City points={points} unit={unit} reduced={reduced} labels={SKYLINE} orbit />
          </Suspense>
          <DialogClose className="skc-close" aria-label={SKYLINE.close}>
            <X size={20} aria-hidden="true" />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </figure>
  );
}
