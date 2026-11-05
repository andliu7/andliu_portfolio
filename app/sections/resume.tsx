import { ArrowUpRight, Download } from 'lucide-react';
import { RESUME, RESUME_PREVIEW, sectionAttrs } from '@/lib/site';
import { ResumeCard } from './resume.client';
import './resume.css';

// The résumé preview, between Contact and the island finale (Andrew 2026-10-07: a light preview
// instead of a heavy PDF viewer). Page one of the PDF as an image on a tilted paper card, the
// title and one line beside it, and two plain links: open the PDF in a new tab, or download it.
// Clicking the card opens the browser's own PDF viewer in a dialog (resume.client.tsx).
// Costs nothing while scrolling: no canvas, no scroll listener, the image is loading="lazy" and
// the PDF itself is only fetched when the dialog opens or a button is clicked.
//
// One full screen, held (Andrew 2026-10-12: "make the resume one full page", "make it stick when
// scrolling before you get to the island"): .rs-page is exactly one screen and carries the
// section's ground; it sticks for a short runway (resume.css) and then the island follows. Its
// top edge is plain ink, the same as the page around the Contact card above. .rs-card-cell is the box the card is sized to fit (a size container), so
// the page never needs to scroll inside itself, on a desktop or a phone.
//
// 2026-11-03 ("one day, scrolled"): the section sits at night on the one shared ground
// (components/site/ground.tsx). No stars here (they belong to the island alone) and no photo print
// (Andrew: it made the section cluttered): just the title, the line, the page and the two links.
//
// The images are rendered once, offline, from the PDF. Re-run this from the repo root (Python
// with PyMuPDF and Pillow) whenever public/andrew-liu-resume.pdf changes; it is a one-page résumé:
//   python -c "import pymupdf,io;from PIL import Image;p=pymupdf.open('public/andrew-liu-resume.pdf')[0];im=Image.open(io.BytesIO(p.get_pixmap(dpi=400).tobytes('png'))).convert('RGB');[im.resize((w,round(w*11/8.5)),Image.LANCZOS).save(f'public/images/resume/resume-p1{s}.webp',quality=88,method=6) for w,s in ((1600,''),(800,'-sm'))]"

export default function Resume() {
  return (
    <section {...sectionAttrs('resume')} className="resume" aria-labelledby="resume-title">
      <div className="rs-page">
        <div className="rs-wrap">
          <div className="rs-text">
            <h2 id="resume-title" className="display rs-title">{RESUME_PREVIEW.title}</h2>
            <p className="rs-line">{RESUME_PREVIEW.line}</p>
          </div>
          <div className="rs-card-cell">
            <ResumeCard />
            {/* A hand-drawn note pointing at the card: it opens on click (resume.css .rs-click) */}
            <span className="rs-click" aria-hidden="true">
              {RESUME_PREVIEW.clickHere}
              <svg viewBox="0 0 90 70" focusable="false"><path d="M8 8 C 30 6, 62 14, 74 52" /><path d="M62 46 L 75 56 L 82 40" /></svg>
            </span>
          </div>
          <div className="rs-actions">
            <a className="pill pill-berry pill-big" href={RESUME} target="_blank" rel="noreferrer">
              {RESUME_PREVIEW.open} <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <a className="pill pill-light pill-big" href={RESUME} download={RESUME_PREVIEW.file}>
              <Download size={18} aria-hidden="true" /> {RESUME_PREVIEW.download}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
