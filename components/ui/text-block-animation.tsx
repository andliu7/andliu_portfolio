'use client';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useReducedMotion } from '@/components/site/use-reduced-motion';

// The block-wipe line reveal (Andrew 2026-10-12, after landonorris.com): a colour block sweeps
// across each line left to right, the line appears under it once it is fully covered, then the
// block sweeps off to the right. Lines follow 0.1s apart, expo.inOut, 0.6s per sweep. It plays at
// "top 85%" and reverses if you scroll back above it ('play none none reverse').
//
// Two entry points share one timeline (sweep below):
//   TextBlockAnimation  eyebrows and intro lines. gsap SplitText cuts the text into lines; each
//                       line gets a wrapper with its block. autoSplit re-cuts on resize and when
//                       the fonts land.
//   FlipReveal          FlipHeading's display headings (components/site/flip-heading.tsx). Those
//                       are already one cell per letter with an sr-only copy, so SplitText would
//                       tear that apart. Instead it groups the cells into visual lines by where
//                       they sit, lays one block per line in an aria-hidden layer over the
//                       heading, and fades whole cells. The hover roll is untouched (it moves
//                       .fh-roll inside the cell; this only touches the cell's opacity).
//
// Block colours are site tokens, var(--kw) by default: each ground's keyword colour, which is
// already chosen to read on it (berry on paper, apricot on the dark grounds). gsap only animates
// scaleX, so the colour stays a CSS var and never needs a computed literal.
//
// Safe by default: text is never hidden in the server HTML or by CSS. Only after the timeline is
// built does gsap set the lines to opacity 0, so with JS off, under reduced motion, or if gsap
// throws, the text simply stays. Reduced motion skips the whole thing; flipping the Motion switch
// re-runs the effect, whose cleanup reverts everything.
//
// Pattern: useLayoutEffect + gsap.context. The layout effect runs before the browser paints the
// hydrated tree, and gsap.context records every tween, set and ScrollTrigger made inside it, so
// one ctx.revert() in the cleanup undoes them all (@gsap/react's useGSAP is not installed; this
// is what it wraps).
//
// Lenis: no wiring here. app/motion.tsx already calls ScrollTrigger.update on every Lenis scroll,
// and Experience's pin is a CSS sticky runway, so trigger positions are plain document offsets.

let registered = false;
function ensurePlugins() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  registered = true;
}

type SweepOptions = {
  animateOnScroll: boolean;
  delay: number;
  stagger: number;
  duration: number;
  /** Already finished before a re-measure: jump to the end instead of playing again. */
  done: boolean;
  onDone: (done: boolean) => void;
};

/** One sub-sequence per line, offset by `stagger`: block in from the left, line on, block out to the right. */
function sweep(trigger: Element, blocks: HTMLElement[], lines: Element[][], opts: SweepOptions) {
  const tl = gsap.timeline({
    paused: !opts.animateOnScroll,
    delay: opts.delay,
    onComplete: () => opts.onDone(true),
    onReverseComplete: () => opts.onDone(false),
    scrollTrigger: opts.animateOnScroll
      ? { trigger, start: 'top 85%', toggleActions: 'play none none reverse' }
      : undefined,
  });
  gsap.set(blocks, { scaleX: 0, transformOrigin: 'left center' });
  gsap.set(lines.flat(), { opacity: 0 });
  blocks.forEach((block, i) => {
    const at = i * opts.stagger;
    tl.to(block, { scaleX: 1, duration: opts.duration, ease: 'expo.inOut' }, at)
      .set(lines[i], { opacity: 1 }, at + opts.duration)
      .set(block, { transformOrigin: 'right center' }, at + opts.duration)
      .to(block, { scaleX: 0, duration: opts.duration, ease: 'expo.inOut' }, at + opts.duration);
  });
  if (opts.done) tl.progress(1);
  else if (!opts.animateOnScroll) tl.play();
  return tl;
}

function makeBlock(color: string) {
  const block = document.createElement('span');
  block.className = 'tba-block';
  block.setAttribute('aria-hidden', 'true');
  block.style.background = color;
  return block;
}

type Shared = {
  /** Play when scrolled into view (true) or on mount. */
  animateOnScroll?: boolean;
  /** Seconds before the first block moves. */
  delay?: number;
  /** Any CSS colour; use a site token, e.g. 'var(--apricot)'. */
  blockColor?: string;
  /** Seconds between lines. */
  stagger?: number;
  /** Seconds per sweep (in, then out). */
  duration?: number;
};

type Tag = 'p' | 'span' | 'div' | 'h2' | 'h3';

/**
 * Wraps a short run of plain text (an eyebrow, a tagline) and reveals it line by line. Renders the
 * element itself, so it can stand in for the `<span className="eyebrow">` it replaces. Keep the
 * children static text: SplitText rewrites the DOM inside, which React does not track.
 */
export function TextBlockAnimation({
  children, as: As = 'div', id, className, animateOnScroll = true, delay = 0,
  blockColor = 'var(--kw)', stagger = 0.1, duration = 0.6,
}: Shared & { children: ReactNode; as?: Tag; id?: string; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    ensurePlugins();
    let done = false;
    const ctx = gsap.context(() => {
      SplitText.create(el, {
        type: 'lines',
        tag: 'span', // SplitText's default <div> is not allowed inside a <p> or a heading
        linesClass: 'tba-text',
        aria: 'none', // the text stays as written, so readers read it once and nothing is labelled
        autoSplit: true,
        // Runs after every (re)split; returning the timeline lets SplitText kill it before the next.
        onSplit(self) {
          const align = getComputedStyle(el).textAlign;
          const blocks = self.lines.map(line => {
            const wrap = document.createElement('span');
            wrap.className = 'tba-line';
            if (align === 'center') wrap.style.marginInline = 'auto';
            else if (align === 'right' || align === 'end') wrap.style.marginInlineStart = 'auto';
            // appendChild, not append: @cloudflare/workers-types redeclares Element.append (HTMLRewriter)
            line.parentNode?.insertBefore(wrap, line);
            wrap.appendChild(line);
            const block = makeBlock(blockColor);
            wrap.appendChild(block);
            return block;
          });
          return sweep(el, blocks, self.lines.map(line => [line]), {
            animateOnScroll, delay, stagger, duration, done, onDone: next => { done = next; },
          });
        },
      });
    }, el);
    return () => ctx.revert();
  }, [reduced, animateOnScroll, delay, blockColor, stagger, duration]);

  return <As ref={ref as never} id={id} className={className}>{children}</As>;
}

/**
 * FlipHeading's reveal. Renders the aria-hidden layer the blocks sit in, as the heading's last
 * child, and works on its parent (the heading). Re-measures when the heading's size changes (a
 * resize, the display font landing) and only rebuilds if the lines actually moved.
 */
export function FlipReveal({
  animateOnScroll = true, delay = 0, blockColor = 'var(--kw)', stagger = 0.1, duration = 0.6,
}: Shared) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const layer = ref.current;
    const head = layer?.parentElement;
    if (!layer || !head || reduced) return;
    ensurePlugins();
    let done = false;
    let ctx: gsap.Context | null = null;
    let signature = '';
    let frame = 0;

    const teardown = () => { ctx?.revert(); ctx = null; layer.replaceChildren(); };

    const build = () => {
      const cells = Array.from(head.querySelectorAll<HTMLElement>('.fh-stage .fh-cell'));
      if (!cells.length) return;
      // Group cells into visual lines: a cell starts a new line when its top is more than half
      // its height below the current line's. One read pass, then one write pass (no thrash).
      const origin = head.getBoundingClientRect();
      const rects = cells.map(cell => cell.getBoundingClientRect());
      const lines: { cells: HTMLElement[]; left: number; right: number; mid: number }[] = [];
      rects.forEach((r, i) => {
        const last = lines[lines.length - 1];
        const mid = (r.top + r.bottom) / 2;
        if (last && Math.abs(mid - last.mid) < r.height / 2) {
          last.cells.push(cells[i]);
          last.left = Math.min(last.left, r.left);
          last.right = Math.max(last.right, r.right);
        } else lines.push({ cells: [cells[i]], left: r.left, right: r.right, mid });
      });
      const next = `${Math.round(origin.width)}|${lines.map(l => `${l.cells.length}:${Math.round(l.left - origin.left)}:${Math.round(l.mid - origin.top)}`).join(',')}`;
      if (next === signature) return;
      signature = next;
      teardown();

      // The block is one line pitch tall, centred on the glyphs: a cell is taller than the pitch
      // (it holds the roll's second face), so its own box would overlap the next line's block.
      const style = getComputedStyle(head);
      const pitch = parseFloat(style.lineHeight) || parseFloat(style.fontSize);
      const blocks = lines.map(line => {
        const block = makeBlock(blockColor);
        block.style.left = `${line.left - origin.left}px`;
        block.style.width = `${line.right - line.left}px`;
        block.style.top = `${line.mid - origin.top - pitch / 2}px`;
        block.style.height = `${pitch}px`;
        return block;
      });
      blocks.forEach(block => layer.appendChild(block));
      ctx = gsap.context(() => {
        sweep(head, blocks, lines.map(line => line.cells), {
          animateOnScroll, delay, stagger, duration, done, onDone: next => { done = next; },
        });
      });
    };

    try { build(); } catch { teardown(); return; }
    head.classList.add('tba-on');
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { try { build(); } catch { teardown(); } });
    });
    ro.observe(head);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      teardown();
      head.classList.remove('tba-on');
    };
  }, [reduced, animateOnScroll, delay, blockColor, stagger, duration]);

  return <span ref={ref} className="tba-layer" aria-hidden="true" />;
}

export default TextBlockAnimation;
