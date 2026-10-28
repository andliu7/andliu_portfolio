'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { HOVER, RESUME, RESUME_PREVIEW } from '@/lib/site';
import { getLenis } from '@/app/smooth';
import { sunAt, sunOnPhoto, type Sun } from '@/lib/sun';
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
      {/* The hover bubble (Andrew 2026-10-20) says what the aria-label says: it opens full size. */}
      <button type="button" className="rs-card" onClick={show} aria-label={RESUME_PREVIEW.enlarge} data-bubble={HOVER.resume} data-bubble-icon="enlarge">
        <img
          src={img.small}
          srcSet={`${img.small} ${img.smallW}w, ${img.src} ${img.w}w`}
          sizes="(min-width: 900px) 600px, min(84vw, 520px)" /* the card is up to 520px, 600 hovered */
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
          {/* tabIndex -1 on the frame: focus inside a browser PDF viewer swallows Esc and Shift+Tab
              (calibrate F2); keyboard users have Open PDF and Download. */}
          {inline ? (
            <iframe className="rs-frame" src={RESUME} title={RESUME_PREVIEW.title} tabIndex={-1} />
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

// The framed photo of Andrew beside the résumé, as a button that opens it large in the same
// dialog (Andrew 2026-10-25: "you should be able to open the photo of me"). It lives in the
// figure (resume.tsx) in place of the bare <img>, so the frame, caption and tape stay as they were.
// Opened, it is lit for the visitor's time of day (lib/sun.ts): the sun is worked out at the click,
// its spot on the picture drives a glow and a grade in CSS (resume.css .rs-sun), and the same
// photo file serves every hour. Night shows the photo plain until its look is built.
const photo = RESUME_PREVIEW.photo;

export function PhotoOpen() {
  const [open, setOpen] = useState(false);
  const [sun, setSun] = useState<Sun | null>(null);
  const spot = sun && sunOnPhoto(sun);
  const lit = sun && sun.phase !== 'night' ? sun.phase : null;

  useEffect(() => {
    const lenis = getLenis();
    if (!open || !lenis) return;
    lenis.stop();
    return () => lenis.start();
  }, [open]);

  return (
    <>
      <button type="button" className="rs-photo-btn" onClick={() => { setSun(sunAt(new Date())); setOpen(true); }} aria-label={photo.enlarge} data-bubble={photo.enlarge} data-bubble-icon="enlarge">
        <img src={photo.src} srcSet={`${photo.srcSm} 320w, ${photo.src} ${photo.w}w`} sizes="(max-width: 760px) 160px, 320px"
          width={photo.w} height={photo.h} alt={photo.alt} loading="lazy" decoding="async" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rs-dialog rs-photo-dialog" data-ground="ink" showCloseButton={false}>
          <div className="rs-bar">
            <DialogTitle className="rs-dialog-title">{photo.place}{lit && ` ${photo.light[lit]}`}</DialogTitle>
            <DialogClose className="square-btn rs-close" aria-label={RESUME_PREVIEW.close}>
              <X size={20} aria-hidden="true" />
            </DialogClose>
          </div>
          <div className="rs-sun" data-phase={lit ?? undefined} data-behind={spot?.behind || undefined}
            style={spot ? { '--sx': `${spot.x}%`, '--sy': `${spot.y}%` } as CSSProperties : undefined}>
            <img className="rs-photo-full" src={photo.src} width={photo.w} height={photo.h} alt={photo.alt} decoding="async" />
            <span className="rs-sun-sky" aria-hidden="true" />
            <span className="rs-sun-water" aria-hidden="true" />
            <span className="rs-sun-glow" aria-hidden="true" />
            {lit && <img className="rs-sun-me" src={photo.cutout} alt="" aria-hidden="true" decoding="async" />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
