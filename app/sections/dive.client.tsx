'use client';
import { useEffect } from 'react';

// The dive heading's fit (dive.tsx, dive.css), the same idea as hero.client.tsx. After the web
// fonts load it sizes the heading so its widest unbreakable piece fills the column: a whole
// line on a wide column (700px and up), a single word or the keyword on a narrow one, where
// lines may wrap. Then it moves the sticker pair just past the end of the CHEMISTRY line (wide)
// or of THAT (narrow), so it overlaps a word's tail and never covers the keyword.
// Until it runs, dive.css has a CSS size and a fallback spot. It renders nothing.

export function DiveFit() {
  useEffect(() => {
    const head = document.querySelector<HTMLElement>('#dive .dv-head');
    const title = head?.querySelector<HTMLElement>('.dv-title');
    const collage = head?.querySelector<HTMLElement>('.dv-collage');
    if (!head || !title || !collage) return;

    const fit = () => {
      const current = parseFloat(getComputedStyle(title).fontSize);
      const width = head.clientWidth;
      const wide = width >= 700;
      const pieces = Array.from(title.querySelectorAll<HTMLElement>(wide ? '.fh-line' : '.fh-word, .fh-kw'));
      let widest = 0;
      for (const piece of pieces) {
        // the natural width: an inline-block word or keyword measures as is; a block line is
        // measured from its first to its last letter
        const cells = piece.querySelectorAll<HTMLElement>('.fh-cell');
        const box = cells.length ? cells[cells.length - 1].getBoundingClientRect().right - cells[0].getBoundingClientRect().left : piece.getBoundingClientRect().width;
        widest = Math.max(widest, box);
      }
      if (!current || !widest) return;
      const size = Math.min((current * width * (wide ? 0.98 : 1)) / widest, 168);
      title.style.fontSize = `${Math.floor(size)}px`;
      requestAnimationFrame(() => {
        // Wide: the end of the CHEMISTRY line. Narrow (CHEMISTRY fills the width there): the end
        // of THAT, the short word that starts the third line.
        const lines = title.querySelectorAll<HTMLElement>('.fh-line');
        const scope = wide ? lines[1] : lines[2]?.querySelector<HTMLElement>('.fh-word');
        const cells = scope?.querySelectorAll<HTMLElement>('.fh-cell');
        if (!cells?.length) return;
        const last = cells[cells.length - 1].getBoundingClientRect();
        const origin = head.getBoundingClientRect();
        collage.style.left = `${last.right - origin.left}px`;
        collage.style.top = `${(wide ? last.bottom : (last.top + last.bottom) / 2) - origin.top}px`;
        head.setAttribute('data-fit', '');
      });
    };

    let alive = true;
    document.fonts.ready.then(() => { if (alive) fit(); });
    // Only a change of width refits (the fit itself changes the height), and never inside the
    // observer's own callback: the next frame, so the browser does not report a resize loop.
    let lastWidth = 0;
    let pending = 0;
    const observer = new ResizeObserver(entries => {
      const width = Math.round(entries[0].contentRect.width);
      if (width === lastWidth) return;
      lastWidth = width;
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(fit);
    });
    observer.observe(head);
    return () => { alive = false; observer.disconnect(); cancelAnimationFrame(pending); };
  }, []);
  return null;
}
