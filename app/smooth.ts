import type Lenis from 'lenis';

// One Lenis instance for the whole page. motion.tsx creates it; jump.ts, the menu and the island
// need it to scroll and to freeze the page while an overlay is open.
// Pattern: a plain module-level variable. Every client component imports this same module, so
// they share the value without React context or props.

let lenis: Lenis | null = null;

export function setLenis(next: Lenis | null) { lenis = next; }

/** Null under reduced motion (there is no Lenis then) and before the director has mounted. */
export function getLenis(): Lenis | null { return lenis; }

export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 1.6 });
  else window.scrollTo({ top: y });
}

export function freezeScroll(frozen: boolean) {
  if (frozen) lenis?.stop(); else lenis?.start();
  document.documentElement.style.overflow = frozen ? 'hidden' : '';
}
