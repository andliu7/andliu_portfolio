'use client';
import { useEffect } from 'react';

// The hero's fit (hero.tsx, hero.css). CSS alone cannot size the name to the band: the display
// face's letters are not one width, so "chars times a factor" either overflows or leaves a gap.
// After the web fonts have loaded (document.fonts.ready), this measures the name at its current
// size and sets --fs-js on the stage so that:
//   1. the name, one line, fills the glass card's inner width exactly, and
//   2. on a stage 640px or wider, the band and the room under it for the bar on the
//      seam still fit the first screen (the name and the room for its objects shrink first; a phone
//      scrolls, so there the width alone decides).
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
    const foot = hero?.querySelector<HTMLElement>('.hero-foot');
    const band = hero?.querySelector<HTMLElement>('.hero-band');
    const name = hero?.querySelector<HTMLElement>('.hero-name');
    if (!hero || !stage || !band || !wrap || !foot || !name) return;

    const fit = () => {
      const current = parseFloat(getComputedStyle(name).fontSize);
      // The name's natural width at the current size, wherever its column would wrap it
      name.style.width = 'max-content';
      const natural = name.getBoundingClientRect().width;
      name.style.width = '';
      if (!current || !natural) return;
      // the name's column is the glass card's inside (hero.css .hero-card), the namewrap's width
      let size = (current * wrap.clientWidth) / natural;
      if (stage.clientWidth >= 640) {
        // The name's wrapper (the letters plus the room above them for the objects) and the foot
        // under it (its wide-stage min-height is in units of --fs) scale with the size; everything
        // else in the hero stays put, so solve for their height. The foot counts as scaling whole,
        // which errs small (its -40px, or the button's own height when that is taller), never over the fold.
        // The bar (.hero-strip) hangs on the seam, out of the flow; the hero's bottom
        // padding is the room it takes above it (hero.css), so it is what comes after the band.
        // Layout boxes (offsetTop/offsetHeight) ignore transforms, so the entrance's rise and the
        // bar's centring do not skew this. The hero is a screen less 27px (half the bar) tall.
        const wrapHeight = wrap.offsetHeight + foot.offsetHeight;
        const heroTop = hero.getBoundingClientRect().top + window.scrollY;
        const below = parseFloat(getComputedStyle(hero).paddingBottom);
        // band.offsetTop less its own top margin: a centred band's auto margin is free space too
        const bandTop = band.offsetTop - parseFloat(getComputedStyle(band).marginTop);
        const rest = heroTop + bandTop + band.offsetHeight + below - wrapHeight;
        const room = window.innerHeight - 27 - rest;
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

// The name's one roll (hero.css, .hero-name[data-roll]). About 4.5 seconds after the loader
// lifts (html.is-loaded), while the hero is on screen and the tab visible, it sets data-roll on the h1 once and
// leaves it: the letters roll over to their second face and stay there (Andrew 2026-10-07: "delay
// it more just one flip and keep it there"). Under reduced motion it never rolls. Like HeroFit it
// renders nothing and works on the server HTML's h1.
// It also runs LIU's flip to his Chinese surname (hero.css .hero-liu): data-zh on the h1 while the
// pointer is over LIU itself, or for 1.6s after a tap on it. That is separate from the roll, and
// works before or after it.
const ROLL_AFTER = 4500;

export function NameRoll() {
  useEffect(() => {
    const d = document.documentElement;
    const name = document.getElementById('hero-title');
    const hero = document.getElementById('top');
    if (!name || !hero) return;

    const liu = name.querySelector<HTMLElement>('.hero-liu');
    // when the loader lifted; -1 until it has
    let started = d.classList.contains('is-loaded') ? performance.now() : -1;
    let onScreen = true;
    let tapBack = 0;
    let timer = 0;
    // (Re)arm the one timer for whatever is left of the 4.5s, only while the name can be seen
    const arm = () => {
      window.clearTimeout(timer);
      if (name.hasAttribute('data-roll') || d.getAttribute('data-motion') === 'reduced') return;
      if (started < 0 || !onScreen || document.visibilityState !== 'visible') return;
      timer = window.setTimeout(() => {
        if (d.getAttribute('data-motion') === 'reduced') return;
        name.setAttribute('data-roll', '');
        observer.disconnect();
        document.removeEventListener('visibilitychange', arm);
      }, Math.max(0, ROLL_AFTER - (performance.now() - started)));
    };
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; arm(); });
    observer.observe(hero);
    // Not loaded yet: watch <html>'s class list until is-loaded lands, then start the clock
    const loaded = new MutationObserver(() => {
      if (!d.classList.contains('is-loaded')) return;
      loaded.disconnect();
      started = performance.now();
      arm();
    });
    if (started < 0) loaded.observe(d, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', arm);
    const zhOn = () => name.setAttribute('data-zh', '');
    const zhOff = () => name.removeAttribute('data-zh');
    const onEnter = (e: PointerEvent) => { if (e.pointerType !== 'touch') zhOn(); };
    const onLeave = (e: PointerEvent) => { if (e.pointerType !== 'touch') zhOff(); };
    const onTap = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      zhOn();
      window.clearTimeout(tapBack);
      tapBack = window.setTimeout(zhOff, 1600);
    };
    liu?.addEventListener('pointerenter', onEnter);
    liu?.addEventListener('pointerleave', onLeave);
    liu?.addEventListener('pointerdown', onTap);
    return () => {
      liu?.removeEventListener('pointerenter', onEnter);
      liu?.removeEventListener('pointerleave', onLeave);
      liu?.removeEventListener('pointerdown', onTap);
      window.clearTimeout(tapBack);
      name.removeAttribute('data-zh');
      observer.disconnect(); loaded.disconnect();
      document.removeEventListener('visibilitychange', arm);
      window.clearTimeout(timer);
      name.removeAttribute('data-roll');
    };
  }, []);
  return null;
}
