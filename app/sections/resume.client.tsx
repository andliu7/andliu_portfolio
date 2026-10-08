'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { RESUME, RESUME_PREVIEW } from '@/lib/site';
import { getLenis } from '@/app/smooth';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';

// The résumé page image as a button that opens the PDF in a dialog (app/sections/resume.tsx).
// The dialog is components/ui/dialog.tsx (Base UI): it traps focus, closes on Esc, and returns
// focus to the card. Its contents only mount while it is open, so the <iframe> (and the PDF
// download it starts) does not exist until the visitor asks for it.
// Pattern: a controlled dialog. `open` lives here in state and the dialog reports Esc and the
// close button through onOpenChange, so this component is the one source of truth.

const img = RESUME_PREVIEW.image;

export function ResumeCard() {
  const [open, setOpen] = useState(false);
  // Whether this browser can show a PDF inline. Read at click time, not during render, so the
  // server HTML and the first client render agree. iOS Safari reports false: it gets the image.
  const [inline, setInline] = useState(true);

  // Hold the smooth scroller still while the dialog is up, as the island's door does.
  useEffect(() => {
    const lenis = getLenis();
    if (!open || !lenis) return;
    lenis.stop();
    return () => lenis.start();
  }, [open]);

  const show = () => {
    setInline(navigator.pdfViewerEnabled === true);
    setOpen(true);
  };

  return (
    <>
      <button type="button" className="rs-card" onClick={show} aria-label={RESUME_PREVIEW.enlarge}>
        <img
          src={img.small}
          srcSet={`${img.small} ${img.smallW}w, ${img.src} ${img.w}w`}
          sizes="(min-width: 900px) 400px, min(84vw, 400px)"
          width={img.w} height={img.h} alt={img.alt}
          loading="lazy" decoding="async"
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rs-dialog" data-ground="ink" showCloseButton={false}>
          <div className="rs-bar">
            <DialogTitle className="rs-dialog-title">{RESUME_PREVIEW.title}</DialogTitle>
            <a className="pill pill-berry" href={RESUME} target="_blank" rel="noreferrer">
              {RESUME_PREVIEW.open} <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <DialogClose className="square-btn rs-close" aria-label={RESUME_PREVIEW.close}>
              <X size={20} aria-hidden="true" />
            </DialogClose>
          </div>
          {inline ? (
            <iframe className="rs-frame" src={RESUME} title={RESUME_PREVIEW.title} />
          ) : (
            <div className="rs-fallback">
              <p className="rs-note">{RESUME_PREVIEW.noInline}</p>
              <img src={img.src} width={img.w} height={img.h} alt={img.alt} decoding="async" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
