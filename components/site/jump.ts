import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLenis } from '@/app/smooth';
import { EVENTS, emit } from './handoffs';
import { resyncSection } from './section-state';

// Long jumps (SITE-PLAN.md 1.6). A smooth scroll across ten viewports would mount every heavy
// component on the way (WebGL contexts included) and flash every ground colour. Instead:
//   1. set html[data-jumping] and fade an ink veil in over 120ms (instant under reduced motion)
//   2. scroll there in one frame, then tell ScrollTrigger
//   3. two frames later drop data-jumping, resync the section and ground, let NearViewport re-check
//      what is on screen now, and fade the veil out over 180ms
// Every in-page link to a target more than two viewports away comes through here.

let veil: HTMLDivElement | null = null;
let busy = false;

function getVeil() {
  if (veil && veil.isConnected) return veil;
  veil = document.createElement('div');
  veil.className = 'jump-veil';
  veil.setAttribute('aria-hidden', 'true');
  document.body.appendChild(veil);
  return veil;
}

function resolve(target: string | HTMLElement | number): HTMLElement | number | null {
  if (typeof target === 'number' || target instanceof HTMLElement) return target;
  const id = target.replace(/^\/?#/, '');
  return document.getElementById(id);
}

/**
 * Jump to an element, a selector like "#work", or a document y in px (the island piece uses a y
 * to land part-way through its sticky track). `offset` is added to the element's top.
 */
export function jumpTo(target: string | HTMLElement | number, opts: { offset?: number } = {}) {
  const dest = resolve(target);
  if (dest === null || busy) return;
  busy = true;
  const root = document.documentElement;
  const reduced = root.getAttribute('data-motion') === 'reduced';
  const cover = getVeil();
  root.setAttribute('data-jumping', '');
  cover.style.transition = reduced ? 'none' : 'opacity 120ms linear';
  cover.style.opacity = '1';

  const land = () => {
    const offset = opts.offset ?? 0;
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(dest, { immediate: true, force: true, offset });
    } else {
      const y = typeof dest === 'number' ? dest : dest.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    }
    ScrollTrigger.update();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.removeAttribute('data-jumping');
      resyncSection();
      emit(EVENTS.jumpEnd);
      cover.style.transition = reduced ? 'none' : 'opacity 180ms linear';
      cover.style.opacity = '0';
      busy = false;
    }));
  };

  if (reduced) land();
  else window.setTimeout(land, 120);
}

/**
 * Runs `change` (for example docking the chat panel, which narrows <main>) and then scrolls so
 * the block that was at the viewport centre is back at the same height on screen.
 */
export function preserveAnchor(change: () => void) {
  const probe = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  const sectionEl = probe?.closest<HTMLElement>('section[id]') ?? null;
  // The nearest child of the section that contains the probe: a block, not a span of text.
  let anchor: HTMLElement | null = probe instanceof HTMLElement ? probe : null;
  while (anchor && sectionEl && anchor.parentElement && anchor.parentElement !== sectionEl) anchor = anchor.parentElement;
  const el = anchor ?? sectionEl;
  const before = el?.getBoundingClientRect().top ?? 0;
  change();
  ScrollTrigger.refresh();
  if (!el) return;
  const delta = el.getBoundingClientRect().top - before;
  if (Math.abs(delta) < 1) return;
  const y = window.scrollY + delta;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
}
