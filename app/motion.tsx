'use client';
import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { SECTIONS, type Ground, type SectionId } from '@/lib/site';
import { setLenis, getLenis } from './smooth';
import { registerResync, setSection } from '@/components/site/section-state';
import { jumpTo } from '@/components/site/jump';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// The page's motion director. It renders nothing; it only owns what every section shares:
//   1. Lenis smooth scroll, driven by GSAP's ticker so ScrollTrigger and Lenis stay in step
//   2. reveals, once, the first time a block scrolls into view (SITE-PLAN.md 2.2):
//        data-reveal="lines"  gsap SplitText splits it into lines that rise out of a mask
//        data-reveal="words"  the same, word by word
//        data-reveal          the block fades up 24px
//   3. section state: one trigger per `main section[id][data-ground]`, the only caller of
//      setSection() in components/site/section-state.ts (1.4)
//   4. in-page links: a target more than two viewports away goes through jumpTo, so a long trip
//      never mounts every heavy component on the way (1.6). #island is the island's to handle.
//   5. FlipHeading taps and Enter: data-flipped for 900ms, so touch and keyboard see the flip
// Section motion lives in each section's own client enhancer, not here.
//
// Pattern: an "effect-only" component. useEffect runs in the browser after the page mounts, and
// the function it returns runs on unmount to undo everything. It lists `reduced` as a
// dependency, so flipping the menu's Motion switch tears everything down and builds it again
// the other way (no Lenis and no reveals under reduced motion: the page scrolls natively and
// every block is simply there).

const SECTION_LINE = 0.55; // a section is "current" while it crosses 55% of the viewport height
const KNOWN = new Set<string>(SECTIONS.map(s => s.id));

export default function Motion() {
  const reduced = useReducedMotion();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });
    const lenis = reduced ? null : new Lenis({ lerp: 0.1, anchors: false });
    const cleanups = [
      lenis ? syncLenis(lenis) : () => {},
      reduced ? () => {} : reveals(),
      sectionTriggers(),
      linkDelegate(),
      flipTaps(),
    ];
    // Tells the BOOT failsafe (app/layout.tsx) that the director is running.
    document.documentElement.classList.add('motion-ready');
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    return () => cleanups.forEach(fn => fn());
  }, [reduced]);

  return null;
}

// Lenis eases the real document scroll, so ScrollTrigger and native anchors keep working.
// ScrollTrigger is told about every Lenis frame, and both run off GSAP's one ticker.
function syncLenis(lenis: Lenis) {
  const off = lenis.on('scroll', ScrollTrigger.update);
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  setLenis(lenis);
  return () => { off(); gsap.ticker.remove(raf); setLenis(null); lenis.destroy(); };
}

// Reveals. Plain [data-reveal] blocks (and SplitHeading's letters) get .is-in the first time
// they come into view; the CSS transition does the rest. data-reveal="lines" and "words" go
// through gsap SplitText: each line (or word) is wrapped in a mask and the inner part rises 100%
// out of it, staggered 80ms (lines) or 35ms (words), once, at "top 85%". autoSplit re-splits
// when the fonts finish loading or the width changes; onSplit returns the animation so SplitText
// can kill and rebuild it, and once an element has played a re-split just leaves it in place.
// The hidden start states are CSS that applies only under html.js with full motion, so with JS
// off or reduced motion nothing is ever hidden.
// Sections that mount later (NearViewport, lazy chunks) are picked up by a MutationObserver, so
// a reveal inside them can never stay hidden.
function reveals() {
  const seen = new WeakSet<HTMLElement>();
  const played = new WeakSet<HTMLElement>();
  const splits: SplitText[] = [];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -15% 0px' });

  const split = (el: HTMLElement) => {
    const byWords = el.dataset.reveal === 'words';
    splits.push(SplitText.create(el, {
      type: byWords ? 'words' : 'lines',
      mask: byWords ? 'words' : 'lines',
      autoSplit: true,
      onSplit(self) {
        el.classList.add('is-split');
        if (played.has(el)) return;
        return gsap.from(byWords ? self.words : self.lines, {
          yPercent: 100,
          duration: 0.9,
          ease: 'expo.out',
          stagger: byWords ? 0.035 : 0.08,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onComplete: () => { played.add(el); el.classList.add('is-in'); },
        });
      },
    }));
  };

  const scan = () => {
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      if (el.dataset.reveal === 'lines' || el.dataset.reveal === 'words') split(el);
      else observer.observe(el);
    });
  };
  scan();

  // Batched to one scan per frame, however many nodes React adds at once.
  let frame = 0;
  const mutations = new MutationObserver(() => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; scan(); });
  });
  mutations.observe(document.body, { childList: true, subtree: true });

  return () => {
    cancelAnimationFrame(frame);
    mutations.disconnect();
    observer.disconnect();
    splits.forEach(s => s.revert());
    document.querySelectorAll('.is-split').forEach(el => el.classList.remove('is-split'));
  };
}

// One trigger per section: while a section crosses the 55% line its id and ground apply. Only
// the ten sections in SECTIONS count (About's blocks are not landing sections). The same check
// is registered as the resync jump.ts calls after a long jump lands.
function sectionTriggers() {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id][data-ground]'))
    .filter(el => KNOWN.has(el.id));
  if (!sections.length) return () => {};
  const apply = (el: HTMLElement) => setSection(el.id as SectionId, el.dataset.ground as Ground);
  const triggers = sections.map(el => ScrollTrigger.create({
    trigger: el,
    start: `top ${SECTION_LINE * 100}%`,
    end: `bottom ${SECTION_LINE * 100}%`,
    onToggle: self => { if (self.isActive) apply(el); },
  }));
  const resync = () => {
    const line = window.innerHeight * SECTION_LINE;
    const current = sections.find(el => {
      const box = el.getBoundingClientRect();
      return box.top <= line && box.bottom > line;
    }) ?? (window.scrollY <= 0 ? sections[0] : sections[sections.length - 1]);
    if (current) apply(current);
  };
  registerResync(resync);
  resync();
  return () => { triggers.forEach(t => t.kill()); registerResync(null); };
}

// In-page anchors. Near targets scroll smoothly (Lenis, or native under reduced motion); a
// target more than two viewports away goes through jumpTo. #island is not handled here: the
// island's own capture-phase delegate takes it first and stops the event. #main (the skip link)
// is left to the browser, which also moves keyboard focus there.
function linkDelegate() {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!link || link.target === '_blank') return;
    const href = link.getAttribute('href') ?? '';
    const hash = href.startsWith('#') ? href : href.startsWith('/#') && location.pathname === '/' ? href.slice(1) : null;
    if (!hash || hash === '#' || hash === '#main' || hash === '#island') return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    event.preventDefault();
    const distance = Math.abs(target.getBoundingClientRect().top);
    if (distance > window.innerHeight * 2) jumpTo(target);
    else {
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(target, { duration: 1.1 });
      else target.scrollIntoView({ behavior: 'auto' });
    }
    history.pushState(null, '', hash);
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}

// FlipHeading (components/site/flip-heading.tsx) flips on :hover and :focus-visible in CSS. A tap
// has no hover and a mouse click leaves no focus ring, so a touch tap or Enter on a heading sets
// data-flipped for 900ms. The link still does its job (it goes to its own section).
function flipTaps() {
  const timers = new Map<Element, number>();
  const flip = (el: Element) => {
    window.clearTimeout(timers.get(el));
    el.setAttribute('data-flipped', '');
    timers.set(el, window.setTimeout(() => { el.removeAttribute('data-flipped'); timers.delete(el); }, 900));
  };
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    const head = (event.target as Element | null)?.closest('.flip-head');
    if (head) flip(head);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    const head = (event.target as Element | null)?.closest('.flip-head');
    if (head) flip(head);
  };
  document.addEventListener('pointerdown', onPointer);
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('pointerdown', onPointer);
    document.removeEventListener('keydown', onKey);
    timers.forEach((timer, el) => { window.clearTimeout(timer); el.removeAttribute('data-flipped'); });
  };
}
