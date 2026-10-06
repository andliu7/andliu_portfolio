'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft } from 'lucide-react';
import { freezeScroll, scrollToY } from './smooth';

// The last section: the game's front door. It owns everything about the island on this page:
//  1. A pinned scrub. A tilted rounded screen showing a still of the island straightens and
//     grows until it fills the viewport.
//  2. A Pokemon-style box that slides up once the screen is full: "Go to the game?"
//  3. On yes, a full-viewport overlay with the game in an iframe. The iframe is only created
//     then, so three.js never downloads for a visitor who just reads the page.
// It also catches every link to #island on the page (the hero pill, each Work row's
// "Visit on the island") and scrolls to the end of the pin, where the box is showing.

const REDUCED = '(prefers-reduced-motion: reduce)';
const FULL_MOTION = '(prefers-reduced-motion: no-preference)';
const PROMPT = 'Go to the game?';
const PHONE_NOTE = ' It plays best on a computer, but you can try it here.';
const CHOICES = ['Yes, drive', 'Not now'] as const;

// Types the text out one letter at a time while `active`, and resets when it goes false.
// Pattern: a custom hook, a plain function whose name starts with "use" so it may call hooks.
function useTyped(text: string, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) { setCount(0); return; }
    if (window.matchMedia(REDUCED).matches) { setCount(text.length); return; }
    let shown = 0;
    const timer = window.setInterval(() => {
      shown += 1;
      setCount(shown);
      if (shown >= text.length) window.clearInterval(timer);
    }, 40);
    return () => window.clearInterval(timer);
  }, [text, active]);
  return { typed: text.slice(0, count), done: count >= text.length };
}

export default function IslandSection() {
  // Refs hold DOM nodes and values that change without needing a re-render.
  const sectionRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const choiceRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const zoneRef = useRef('');

  const [ready, setReady] = useState(false); // the screen fills the view (reduced motion: the section is on screen)
  const [dismissed, setDismissed] = useState(false); // "Not now" was chosen on this visit
  const [selected, setSelected] = useState(0);
  const [phone, setPhone] = useState(false);
  const [gameSrc, setGameSrc] = useState<string | null>(null); // null means no iframe exists

  const playing = gameSrc !== null;
  const boxOpen = ready && !dismissed && !playing;
  const { typed, done } = useTyped(phone ? PROMPT + PHONE_NOTE : PROMPT, boxOpen);

  // 1. The pinned scrub. Under reduced motion there is no pin, only a trigger that says
  // when the section is on screen.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;
    setPhone(window.matchMedia('(pointer: coarse), (max-width: 760px)').matches);
    const media = gsap.matchMedia();
    media.add(REDUCED, () => {
      triggerRef.current = ScrollTrigger.create({
        trigger: section, start: 'top 40%', end: 'bottom top',
        onToggle: self => { setReady(self.isActive); if (!self.isActive) setDismissed(false); },
      });
    });
    media.add(FULL_MOTION, () => {
      const screen = section.querySelector('.isl-screen');
      const head = section.querySelector('.isl-head');
      const progress = (p: number) => {
        setReady(p >= 0.86); // React skips the re-render when the value has not changed
        if (p < 0.6) setDismissed(false); // scrolled well back up: offer again next time
      };
      const timeline = gsap.timeline({ scrollTrigger: {
        trigger: section.querySelector('.isl-stage'), start: 'top top', end: '+=170%',
        pin: true, scrub: 0.6, invalidateOnRefresh: true, onUpdate: self => progress(self.progress),
      } });
      timeline
        .fromTo(screen,
          { transformPerspective: 1400, rotationX: 18, rotationY: -14, rotationZ: 4, scale: 0.56, borderRadius: 44 },
          { rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1, borderRadius: 0, ease: 'power2.inOut', duration: 0.8 }, 0)
        .to(head, { yPercent: -80, autoAlpha: 0, ease: 'none', duration: 0.3 }, 0.05)
        .to({}, { duration: 0.2 }); // hold the full screen for the last stretch of the pin
      triggerRef.current = timeline.scrollTrigger ?? null;
    });
    // Pins created at different times must be measured top to bottom, or later ones land short.
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    return () => { media.revert(); triggerRef.current = null; };
  }, []);

  // Every link to #island scrolls here and remembers which building it asked for.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href="#island"]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      event.stopPropagation(); // keeps Lenis's own anchor handler from scrolling to the pin's start
      zoneRef.current = link.dataset.islandZone ?? '';
      setDismissed(false);
      const trigger = triggerRef.current;
      const top = (sectionRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
      scrollToY(trigger?.pin ? trigger.end - 2 : top);
    };
    document.addEventListener('click', onClick, true); // capture phase runs before Lenis's listener
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  const openGame = () => {
    const zone = zoneRef.current;
    // flushSync makes React put the overlay on the page right now, inside this click or
    // key handler, because browsers only allow requestFullscreen during a user gesture.
    flushSync(() => setGameSrc(`/island/index.html${zone ? `#${zone}` : ''}`));
    freezeScroll(true);
    overlayRef.current?.requestFullscreen?.().catch(() => {
      // iPhone Safari and locked-down browsers refuse; the fixed overlay still covers the view.
    });
  };

  // useCallback keeps one stable function, so the fullscreenchange effect below does not
  // re-subscribe on every render.
  const closeGame = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setGameSrc(null); // unmounting the iframe stops the game and frees its WebGL context
    freezeScroll(false);
    window.requestAnimationFrame(() => choiceRefs.current[0]?.focus({ preventScroll: true }));
  }, []);

  const choose = (index: number) => {
    if (index === 0) openGame();
    else setDismissed(true);
  };

  // Leaving fullscreen (Esc, or the browser's own control) closes the game too.
  useEffect(() => {
    if (!playing) return;
    const onChange = () => { if (!document.fullscreenElement) closeGame(); };
    document.addEventListener('fullscreenchange', onChange);
    iframeRef.current?.focus();
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [playing, closeGame]);

  // Arrow keys move the pointer between the choices and Enter picks, while the box is up.
  // No dependency list: it re-subscribes after every render, so it always sees the current `selected`.
  useEffect(() => {
    if (!boxOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        const next = 1 - selected;
        setSelected(next);
        choiceRefs.current[next]?.focus({ preventScroll: true });
      } else if (event.key === 'Enter' && !document.activeElement?.closest('.isl-box')) {
        // A focused choice button gets Enter natively; this covers focus being elsewhere.
        event.preventDefault();
        choose(selected);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const fullText = phone ? PROMPT + PHONE_NOTE : PROMPT;

  return (
    <section id="island" ref={sectionRef} className="isl" aria-labelledby="island-title">
      <div className="isl-stage">
        <div className="isl-screen">
          <img src="/images/island-still.jpg" alt="The island: a small blue car on a brick plaza beside toy blocks spelling Andrew Liu" width={1418} height={802} loading="lazy" decoding="async" />
        </div>
        <div className="isl-head">
          <span className="eyebrow">06 / The island</span>
          <h2 id="island-title" className="display">Drive the<br />résumé.</h2>
          <p>Every building on the island is a line of my résumé. Keep scrolling to get in.</p>
        </div>

        <div className={boxOpen ? 'isl-box is-open' : 'isl-box'} role="dialog" aria-label={PROMPT} inert={!boxOpen}>
          <p className="isl-text">
            <span className="sr-only">{fullText}</span>
            <span aria-hidden="true">{typed}</span>
            {done && <span className="isl-caret" aria-hidden="true" />}
          </p>
          <div className="isl-choices">
            {CHOICES.map((label, index) => (
              <button
                key={label}
                type="button"
                ref={node => { choiceRefs.current[index] = node; }}
                className={selected === index ? 'isl-choice is-selected' : 'isl-choice'}
                onPointerEnter={() => setSelected(index)}
                onFocus={() => setSelected(index)}
                onClick={() => choose(index)}
              >{label}</button>
            ))}
          </div>
        </div>

        {ready && dismissed && !playing && (
          <button type="button" className="isl-again pill" onClick={() => setDismissed(false)}>Go to the game?</button>
        )}
      </div>

      <div ref={overlayRef} className="isl-overlay" hidden={!playing}>
        {gameSrc && (
          <iframe
            ref={iframeRef}
            src={gameSrc}
            title="Andrew Liu's island, a small driving game"
            allow="fullscreen; autoplay"
            onLoad={() => iframeRef.current?.contentWindow?.focus()}
          />
        )}
        <button type="button" className="isl-back" onClick={closeGame}><ArrowLeft size={18} aria-hidden="true" /> Back to andliu.dev</button>
      </div>
    </section>
  );
}
