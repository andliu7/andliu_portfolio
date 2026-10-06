'use client';
import { useEffect } from 'react';

// The hero's fit (hero.tsx, hero.css). CSS alone cannot size the name to the band: the display
// face's letters are not one width, so "chars times a factor" either overflows or leaves a gap.
// After the web fonts have loaded (document.fonts.ready), this measures the name at its current
// size and sets --fs-js on the stage so that:
//   1. the name fills the stage's width exactly, and
//   2. on a stage 640px or wider, the whole band still ends above the fold (the name shrinks
//      first; a phone scrolls, so there the width alone decides).
// Then it pins each sticker to a point on one letter, measured from the letter's own box, so
// the collage stays on the same letters whatever the font, the width or the line layout.
// Until this runs (and with JavaScript off) hero.css has a conservative CSS size and fallback
// sticker spots; nothing is hidden waiting for it.
//
// It renders nothing: a client component used only for its effect (useEffect runs in the
// browser after the server HTML is on screen).

// sticker key: [letter index in ANDREWLIU, x and y as fractions of that letter's box]
const ANCHORS: Record<string, [number, number, number]> = {
  berry: [3, 0.55, 0.02], // over R's top, well clear of the gap between the two words
  mol: [3, 0.86, 0.88], // R's foot
  card: [1, 0.5, 0.96], // under N, bridging to the line below on a phone
  pan: [8, 0.62, 0.86], // U's lower right, inside the band
  bar: [5, 0.5, 1.04], // under W, in the gap above the ticket
};

export function HeroFit() {
  useEffect(() => {
    const hero = document.getElementById('top');
    const stage = hero?.querySelector<HTMLElement>('.hero-stage');
    const band = hero?.querySelector<HTMLElement>('.hero-band');
    const name = hero?.querySelector<HTMLElement>('.hero-name');
    if (!hero || !stage || !band || !name) return;
    const letters = Array.from(name.querySelectorAll<HTMLElement>('.hero-c'));
    let frame = 0;

    const place = () => {
      for (const [key, [index, fx, fy]] of Object.entries(ANCHORS)) {
        const slot = hero.querySelector<HTMLElement>(`.hero-st-${key}`);
        const letter = letters[index];
        if (!slot || !letter) continue;
        // offsetLeft/Top ignore transforms, so the letters' entrance offset does not skew this
        slot.style.left = `${letter.offsetLeft + fx * letter.offsetWidth}px`;
        slot.style.top = `${letter.offsetTop + fy * letter.offsetHeight}px`;
      }
      hero.setAttribute('data-fit', '');
    };

    const fit = () => {
      const current = parseFloat(getComputedStyle(name).fontSize);
      // The name's natural width at the current size, wherever its column would wrap it
      name.style.width = 'max-content';
      const natural = name.getBoundingClientRect().width;
      name.style.width = '';
      if (!current || !natural) return;
      let size = (current * stage.clientWidth) / natural;
      if (stage.clientWidth >= 640) {
        const nameHeight = name.getBoundingClientRect().height;
        const rest = band.getBoundingClientRect().bottom + window.scrollY - nameHeight;
        const room = window.innerHeight - 16 - rest;
        if (room > 0) size = Math.min(size, (current * room) / nameHeight);
      }
      stage.style.setProperty('--fs-js', `${Math.max(40, Math.floor(size * 0.995))}px`);
      // place after the browser has laid out the new size
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };

    let alive = true;
    document.fonts.ready.then(() => { if (alive) fit(); });
    // Refit when the stage changes width (window resize, chat dock) or the window changes height.
    // For the stage, only a change of width refits (the fit itself changes the height), and never inside the
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
    observer.observe(stage);
    const onResize = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(fit); };
    window.addEventListener('resize', onResize);
    return () => {
      alive = false;
      observer.disconnect(); cancelAnimationFrame(pending);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
