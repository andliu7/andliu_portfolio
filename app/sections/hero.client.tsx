'use client';
import { useEffect } from 'react';

// The hero's fit (hero.tsx, hero.css). CSS alone cannot size the name to the band: the display
// face's letters are not one width, so "chars times a factor" either overflows or leaves a gap.
// After the web fonts have loaded (document.fonts.ready), this measures the name at its current
// size and sets --fs-js on the stage so that:
//   1. the name, one line, fills the glass card's inner width exactly, and
//   2. on a stage 640px or wider, the band and the room under it for the bar and tape on the
//      seam still fit the first screen (the name and the room for its objects shrink first; a phone
//      scrolls, so there the width alone decides).
// The four objects around the name are placed in units of --fs by CSS, so they follow the fit.
// Until this runs (and with JavaScript off) hero.css has a conservative CSS size; nothing is
// hidden waiting for it.
//
// It renders nothing: a client component used only for its effect (useEffect runs in the
// browser after the server HTML is on screen).

// Where the right-hand caution tape enters (hero.css, .hero-tape-right): it comes in from the
// right edge at about the flashcards' bottom and runs down to the left at its tilt, so for every
// thing it must pass under (the objects, their labels on a wide stage, the name and the résumé
// button with its 4px lip) its upper edge must sit below that thing's bottom at the thing's right
// end, the highest the tape gets over it. Take the lowest entry that clears them all, plus 6px.
// Measured after the fit, in the hero's coordinates. Boxes from getBoundingClientRect include the
// objects' fixed tilt, which only makes them a little larger; the button is read from layout
// offsets instead, because before the entrance it still sits 3em low (hero.css .hero-rise).
function placeTape(hero: HTMLElement, stage: HTMLElement) {
  const tape = hero.querySelector<HTMLElement>('.hero-tape-right');
  const button = hero.querySelector<HTMLElement>('.flow-btn');
  if (!tape || !button) return;
  const angle = Math.abs(parseFloat(getComputedStyle(tape).rotate)) * Math.PI / 180;
  const tan = Math.tan(angle);
  const half = tape.offsetHeight / 2 / Math.cos(angle);
  const box = hero.getBoundingClientRect();
  const width = hero.clientWidth;
  const things: Array<[number, number]> = []; // [right, bottom] in the hero's coordinates
  const sel = stage.clientWidth >= 760 ? '.hob, .hob-label, .hero-name' : '.hob, .hero-name';
  hero.querySelectorAll<HTMLElement>(sel).forEach(el => {
    const r = el.getBoundingClientRect();
    things.push([r.right - box.left, r.bottom - box.top]);
  });
  let top = 0, left = 0;
  for (let el: HTMLElement | null = button; el && el !== hero; el = el.offsetParent as HTMLElement | null) { top += el.offsetTop; left += el.offsetLeft; }
  things.push([left + button.offsetWidth, top + button.offsetHeight + 4]);
  // the centre line's height at the right edge, so the upper edge clears every [right, bottom]
  const entry = Math.max(...things.map(([right, bottom]) => bottom + 6 + half - (width - right) * tan));
  // the tape turns about its right end, 48px past the edge (hero.css), so set the height there
  hero.style.setProperty('--tape-y', `${Math.round(entry - 48 * tan)}px`);
}

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
        // The bar and tape (.hero-cross) hang on the seam, out of the flow; the hero's bottom
        // padding is the room they take above it (hero.css), so it is what comes after the band.
        // Layout boxes (offsetTop/offsetHeight) ignore transforms, so the entrance's rise and the
        // tape's tilt do not skew this. The hero is a screen less 27px (half the bar) tall.
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
      placeTape(hero, stage);
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

// The name's intermittent roll (hero.css, .hero-name[data-roll]). Every 6 to 9 seconds, picked
// fresh each time, and once when the pointer enters the name, it sets data-roll on the h1 for
// 1.4s, long enough for the last letter to land, then clears it so the letters roll back. The
// clock only runs while the hero is on screen and the tab is visible; under reduced motion it
// never rolls. Like HeroFit it renders nothing and works on the server HTML's h1.
// It also runs LIU's flip to his Chinese surname (hero.css .hero-liu): data-zh on the h1 while the
// pointer is over LIU itself, or for 1.6s after a tap on it. While that shows, the intermittent
// roll waits, and an entrance straight onto LIU does not start the whole-name roll.
const ROLL_HOLD = 1400;

export function NameRoll() {
  useEffect(() => {
    const d = document.documentElement;
    const name = document.getElementById('hero-title');
    const hero = document.getElementById('top');
    if (!name || !hero) return;

    const liu = name.querySelector<HTMLElement>('.hero-liu');
    let onScreen = true;
    let tapBack = 0;
    let next = 0;
    let back = 0;
    const reduced = () => d.getAttribute('data-motion') === 'reduced';
    const roll = () => {
      if (reduced() || name.hasAttribute('data-roll') || name.hasAttribute('data-zh') || liu?.matches(':hover')) return;
      name.setAttribute('data-roll', '');
      back = window.setTimeout(() => name.removeAttribute('data-roll'), ROLL_HOLD);
    };
    // One timer at a time: (re)start it only while the name can be seen
    const schedule = () => {
      window.clearTimeout(next);
      if (!onScreen || document.visibilityState !== 'visible') return;
      next = window.setTimeout(() => { roll(); schedule(); }, 6000 + Math.random() * 3000);
    };
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; schedule(); });
    observer.observe(hero);
    document.addEventListener('visibilitychange', schedule);
    name.addEventListener('mouseenter', roll);
    const zhOn = () => { window.clearTimeout(back); name.removeAttribute('data-roll'); name.setAttribute('data-zh', ''); };
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
      observer.disconnect();
      document.removeEventListener('visibilitychange', schedule);
      name.removeEventListener('mouseenter', roll);
      window.clearTimeout(next); window.clearTimeout(back);
      name.removeAttribute('data-roll');
    };
  }, []);
  return null;
}
