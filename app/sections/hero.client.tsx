'use client';
import { useEffect } from 'react';

// The hero's fit (hero.tsx, hero.css). CSS alone cannot size the name to the band: the display
// face's letters are not one width, so "chars times a factor" either overflows or leaves a gap.
// After the web fonts have loaded (document.fonts.ready), this measures the name at its current
// size and sets --fs-js on the stage so that:
//   1. the name, one line, fills the stage's width exactly, and
//   2. on a stage 640px or wider, the band and the bar under it still end above the fold (the
//      name and the room for its objects shrink first; a phone scrolls, so there the width
//      alone decides).
// The four objects around the name are placed in units of --fs by CSS, so they follow the fit.
// Until this runs (and with JavaScript off) hero.css has a conservative CSS size; nothing is
// hidden waiting for it.
//
// It renders nothing: a client component used only for its effect (useEffect runs in the
// browser after the server HTML is on screen).

export function HeroFit() {
  useEffect(() => {
    const hero = document.getElementById('top');
    const stage = hero?.querySelector<HTMLElement>('.hero-stage');
    const wrap = hero?.querySelector<HTMLElement>('.hero-namewrap');
    const strip = hero?.querySelector<HTMLElement>('.hero-strip');
    const name = hero?.querySelector<HTMLElement>('.hero-name');
    if (!hero || !stage || !wrap || !strip || !name) return;

    const fit = () => {
      const current = parseFloat(getComputedStyle(name).fontSize);
      // The name's natural width at the current size, wherever its column would wrap it
      name.style.width = 'max-content';
      const natural = name.getBoundingClientRect().width;
      name.style.width = '';
      if (!current || !natural) return;
      let size = (current * stage.clientWidth) / natural;
      if (stage.clientWidth >= 640) {
        // The name's wrapper (the letters plus the room above them for the objects) scales with
        // the size; everything else in the hero stays put, so solve for the wrapper's height.
        // Layout boxes (offsetTop/offsetHeight) ignore transforms, so the entrance's rise and the
        // bar's tilt do not skew this; 24px covers the tilted bar's lower corner.
        const wrapHeight = wrap.offsetHeight;
        const heroTop = hero.getBoundingClientRect().top + window.scrollY;
        const rest = heroTop + strip.offsetTop + strip.offsetHeight - wrapHeight;
        const room = window.innerHeight - 24 - rest;
        if (room > 0) size = Math.min(size, (current * room) / wrapHeight);
      }
      stage.style.setProperty('--fs-js', `${Math.max(40, Math.floor(size * 0.995))}px`);
      hero.setAttribute('data-fit', '');
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
    };
  }, []);
  return null;
}
