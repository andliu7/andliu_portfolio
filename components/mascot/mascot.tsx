'use client';
import { useEffect, useRef, useState } from 'react';
import { EVENTS, on } from '@/components/site/handoffs';
import './mascot.css';

// The berry cursor (SITE-PLAN.md 7, A9). Since 2026-10-11 it is the berry-coloured arrowhead
// everywhere (Andrew: "make the normal blueberry cursor the arrowhead version"); before that it
// was a round berry that turned into the arrowhead over buttons. Loaded only by mascot-slot.tsx,
// and only with a fine pointer, full motion and the menu switch on; everywhere else the native
// cursor stays.
//
//  - It IS the cursor: html[data-cursor="berry"] hides the system one (mascot.css), set on the
//    first pointer move and removed when this unmounts. Text fields keep the native I-beam, and
//    the arrow steps aside over them.
//  - It sits exactly on the pointer, written straight from each pointermove (no spring). A spring
//    always trails the real pointer by a few frames, which read as lag; the browser already
//    delivers pointermove once per frame, so writing there is as close as a DOM cursor can get.
//  - Over anything you can press it grows a little (data-press, a CSS transition), and it ducks
//    when you press.
//  - Over reading text it becomes a slim berry I-beam centred on the hotspot (Andrew, 2026-10-06:
//    a text cursor so highlighting makes sense). It stays an I-beam while you drag out a
//    selection, wherever the pointer wanders.
//  - island:active hides it (the game runs in an iframe with its own cursor).

// Anything you can press: the arrow grows over these.
const PRESSABLE = [
  'a[href]', 'button', '[role="button"]', '[role="switch"]', '[role="tab"]', '[role="link"]', 'summary', 'label', 'select',
  '.pill', '.square-btn', 'input[type="checkbox"]', 'input[type="radio"]', 'input[type="submit"]', 'input[type="button"]', 'input[type="range"]',
].join(', ');
const TEXT_FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="range"]), textarea, [contenteditable="true"]';
// Reading text: the I-beam shows inside these, and over any element with words of its own.
// (Reading the computed cursor is no help here: the berry sets cursor:none on everything.)
const TEXT_BLOCK = ['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'figcaption', 'td'].join(', ');

type Shape = 'arrow' | 'text' | 'none';

const ownText = (el: Element) => Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && Boolean(n.textContent?.trim()));
/** Text you could select: inside a reading block or holding words itself, and not user-select:none. */
const readable = (el: Element) => (el.closest(TEXT_BLOCK) !== null || ownText(el)) && getComputedStyle(el).userSelect !== 'none';
const selecting = () => { const sel = window.getSelection(); return Boolean(sel && !sel.isCollapsed); };

export default function Mascot() {
  const [shape, setShape] = useState<Shape>('arrow');
  const [prev, setPrev] = useState<Shape | null>(null); // the shape leaving, which plays its out-morph
  const [fresh, setFresh] = useState(true); // no morph animation until the first real change
  const [pressable, setPressable] = useState(false);
  const posRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);

  // Everything lives in one effect that runs once on mount; its cleanup undoes all of it.
  useEffect(() => {
    const pos = posRef.current, arrow = arrowRef.current;
    if (!pos || !arrow) return;
    const root = document.documentElement;

    let started = false;
    let current: Shape = 'arrow';
    let hidden = false; // the island is up
    let shown = false;
    const visible = (on: boolean) => {
      const next = on && !hidden;
      if (next !== shown) { shown = next; pos.style.opacity = next ? '1' : '0'; }
    };

    const setTo = (next: Shape) => {
      if (next === current) return;
      setPrev(current);
      current = next;
      setFresh(false);
      setShape(next);
    };
    let dragging = false; // a mouse button is down: a selection may be being dragged out

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      if (!started) { started = true; root.setAttribute('data-cursor', 'berry'); }
      pos.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      // Dragging a selection out of a gap between words: become the I-beam as soon as text is caught.
      if (dragging && current === 'arrow' && selecting()) setTo('text');
      visible(current !== 'none');
    };

    // One delegated listener decides the shape for whatever is under the pointer.
    const onOver = (event: PointerEvent) => {
      const el = event.target as Element | null;
      const press = Boolean(el?.closest(PRESSABLE));
      let next: Shape = !el ? 'arrow' : el.closest(TEXT_FIELD) ? 'none' : press ? 'arrow' : readable(el) ? 'text' : 'arrow';
      if (dragging && next !== 'none' && selecting()) next = 'text'; // mid-selection: keep the I-beam
      setPressable(press);
      setTo(next);
      visible(next !== 'none');
    };
    // Leaving the window (or into an iframe, which has its own cursor): hide.
    const onOut = (event: PointerEvent) => { if (!event.relatedTarget) visible(false); };
    // The press: the arrow ducks and springs back, landing in the first 90ms (feedback under 100ms).
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      dragging = true;
      if (current === 'arrow') {
        arrow.animate([{ transform: 'scale(1)' }, { transform: 'scale(.8)', offset: 0.3 }, { transform: 'scale(1.06)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 280 });
      }
    };
    const onUp = () => { dragging = false; };

    const offIsland = on(EVENTS.islandActive, ({ active }) => { hidden = active; visible(!active); });

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      offIsland();
      root.removeAttribute('data-cursor'); // the native cursor comes back
    };
  }, []);

  return (
    <div className="mascot" aria-hidden="true" data-shape={shape} data-prev={prev ?? undefined} data-fresh={fresh ? '' : undefined} data-press={pressable ? '' : undefined}>
      <div className="mascot-pos" ref={posRef} style={{ opacity: 0 }}>
        <div className="mascot-arrow">
          {/* The arrowhead: tip at (0,0), swept-back sharp tails, no shaft, turned 25deg so it
              points up and to the left. A paper halo under an ink outline keeps it visible on
              every ground; the right half is the berry's shade colour, a flat second shape. */}
          <div className="mascot-grow">
            <svg ref={arrowRef} width="1" height="1" viewBox="0 0 1 1" aria-hidden="true">
              <g transform="rotate(-25)">
                <path d="M0 0 L10.5 23 L0 16.5 L-10.5 23 Z" fill="none" stroke="var(--paper)" strokeWidth="4.5" strokeLinejoin="round" />
                <path d="M0 0 L10.5 23 L0 16.5 L-10.5 23 Z" fill="var(--berry-2)" />
                <path d="M0 0 L10.5 23 L0 16.5 Z" fill="var(--berry)" />
                <path d="M0 0 L10.5 23 L0 16.5 L-10.5 23 Z" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="miter" strokeMiterlimit="10" />
              </g>
            </svg>
          </div>
        </div>
        <div className="mascot-ibeam">
          {/* The I-beam: a 22px bar with short serifs, centred on the hotspot (0,0) so a click
              lands where the selection starts. Paper halo, ink edge, berry core, like the arrow. */}
          <svg width="12" height="26" viewBox="-6 -13 12 26" aria-hidden="true">
            <path d="M-3.5 -11 H3.5 M0 -11 V11 M-3.5 11 H3.5" fill="none" stroke="var(--paper)" strokeWidth="5" strokeLinecap="square" />
            <path d="M-3.5 -11 H3.5 M0 -11 V11 M-3.5 11 H3.5" fill="none" stroke="var(--ink)" strokeWidth="3.4" strokeLinecap="square" />
            <path d="M-3.5 -11 H3.5 M0 -11 V11 M-3.5 11 H3.5" fill="none" stroke="var(--berry)" strokeWidth="1.8" strokeLinecap="square" />
          </svg>
        </div>
      </div>
    </div>
  );
}
