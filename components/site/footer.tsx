'use client';
import { useEffect, useRef, useState } from 'react';
import { SocialButton } from './social-button';
import { usePathname } from 'next/navigation';
import { Briefcase, ChartColumn, Check, Coffee, Copy, FileText, LayoutGrid, Mail } from 'lucide-react';
import { A11Y, CONTACT, FOOTER_SKIP, MICROCOPY, RESUME } from '@/lib/site';
import { getLenis } from '@/app/smooth';
import { Flame } from './flame/flame';
import { Mark } from './mark';
import './footer.css';

// The site footer, ported from the footer of Andrew's Focus Family guide
// (ff_technical_instructions/repo2/index.html, .foot and .laser). It is REVEALED, not reached:
// the page content is one layer up and the footer one layer down, stuck to the bottom of the
// window, so it only shows once you scroll past the end and the page slides up off it.
//
// Why no wrapper around the page: globals.css styles `main > section`, so wrapping the sections in
// a "shell" div would break every section. Instead the footer is the last child of <main> with
// z-index -1, and footer.css makes <main> a stacking context (isolation), so -1 puts the footer
// behind the sections (all opaque, all position: relative) but still above <main> itself, where
// clicks can reach it. The page's own sections are the layer that lifts off.
//
//   .ft-seam  a zero-height strip between the last section and the footer. It moves with the page,
//             so it is the page's bottom edge: the shadow and the glowing "laser" line live there
//   .ft       the footer. Sticky (bottom: 0) only when it fits in the window (data-fits, measured
//             below): taller than the window, its top would stay under the page for good. Without
//             JavaScript, or under reduced motion, it is simply in flow at the end of the page
//
// Every word comes from FOOTER_SKIP in lib/site.ts. On About the in-page targets live on the home
// page, so "#work" becomes "/#work" there.
//
// The AND/LIU mark is the header's, behaviour and all: the same paper card, the letters roll on
// hover and focus (.flip-head; a tap or Enter via the director), the card dances (.ft-mark-host
// in globals.css), and it burns in the same flame. The flame only runs once the page has slid
// far enough to uncover the footer (`revealed` below); stuck under the page it is on screen to
// the browser, but nobody can see it.

const ICONS = { work: LayoutGrid, impact: ChartColumn, experience: Briefcase, resume: FileText, email: Mail, fun: Coffee } as const;

export function SiteFooter() {
  const home = usePathname() === '/';
  const at = (href: string) => (!home && href.startsWith('#') ? `/${href}` : href);
  const seamRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLElement>(null);
  const [fits, setFits] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false); // the copy button reads "Copied" for two seconds
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${CONTACT.email}`; // no clipboard access: open the mail app instead
    }
  };

  // Does the whole footer fit in the window? Re-measured when the window or the footer resizes
  // (a ResizeObserver fires when the element's own box changes, e.g. the font swap).
  useEffect(() => {
    const foot = footRef.current;
    if (!foot) return;
    const measure = () => setFits(foot.offsetHeight <= window.innerHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(foot);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // Uncovered: the seam (the page's bottom edge) has come up into the window, or past its top.
  useEffect(() => {
    const seam = seamRef.current;
    if (!seam) return;
    const io = new IntersectionObserver(([entry]) => setRevealed(entry.boundingClientRect.top < window.innerHeight));
    io.observe(seam);
    return () => io.disconnect();
  }, []);

  // The laser brightens while you scroll (the guide's initLaser): each scroll adds "activity",
  // which decays over about half a second and is written to --act. The animation loop only runs
  // while there is activity left, and never under reduced motion.
  useEffect(() => {
    const seam = seamRef.current;
    if (!seam) return;
    let activity = 0;
    let lastY = window.scrollY;
    let last = 0;
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      activity *= Math.exp(-dt * 2.4);
      if (activity < 0.01) { activity = 0; raf = 0; } else raf = requestAnimationFrame(frame);
      seam.style.setProperty('--act', activity.toFixed(3));
    };
    const onScroll = () => {
      const y = window.scrollY;
      if (document.documentElement.getAttribute('data-motion') === 'reduced') { lastY = y; return; }
      activity = Math.min(1, activity + Math.abs(y - lastY) / 600);
      lastY = y;
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // While the footer is stuck under the page, Tab can land on a link that is covered. So when
  // focus enters it, scroll to the very end, where the footer is uncovered. onFocus bubbles in
  // React (it is the DOM's focusin), so one handler on the footer covers every link inside.
  const reveal = () => {
    if (!fits) return;
    const end = document.documentElement.scrollHeight - window.innerHeight;
    if (window.scrollY >= end - 2) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(end, { immediate: true });
    else window.scrollTo({ top: end });
  };

  return (
    // A fragment: the seam and the footer are two siblings at the end of <main>.
    <>
      <div ref={seamRef} className="ft-seam" aria-hidden="true">
        <span className="ft-laser"><span className="ft-heat" /><span className="ft-glow" /><span className="ft-core" /></span>
      </div>
      <footer ref={footRef} className="ft" data-fits={fits ? '' : undefined} onFocus={reveal}>
        <div className="ft-in">
          <div className="ft-skip">
            <h2 className="ft-h">{FOOTER_SKIP.heading}</h2>
            <p className="ft-note">{FOOTER_SKIP.note}</p>
            <nav aria-label={FOOTER_SKIP.label}>
              <ul className="ft-links">
                {FOOTER_SKIP.links.map(link => {
                  const Icon = ICONS[link.icon];
                  return (
                    <li key={link.href}>
                      <a href={at(link.href)} {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
                        <span className="ft-ico"><Icon size={18} aria-hidden="true" /></span>
                        <span><span className="ft-q">{link.q}</span><span className="ft-a">{link.a}</span></span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
          <div className="ft-brand">
            <Flame className="ft-mark-host" height={20} spread={9} radius={12} paused={!revealed}>
              <a className="ft-mark flip-head" href={home ? '#top' : '/'} aria-label={A11Y.home}><Mark /></a>
            </Flame>
            {/* Testudo beside the blurb (Andrew 2026-10-28: "hide testudo somewhere", then "next to the
                text in the footer"); the official logo, trimmed (public/images/umd/testudo.webp).
                Decoration, so no alt. */}
            <div className="ft-blurb-row">
              <p className="ft-blurb">{FOOTER_SKIP.blurb}</p>
              <img className="ft-testudo" src="/images/umd/testudo.webp" width={500} height={507} alt="" loading="lazy" decoding="async" />
            </div>
            <p className="ft-meta">{FOOTER_SKIP.copyright}</p>
            <div className="ft-social">
              {FOOTER_SKIP.social.map(link => (
                <SocialButton key={link.href} className="ft-btn" href={link.href} label={link.label} kind={link.icon} />
              ))}
              {/* Copy email and the résumé, the same expanding icon buttons (Andrew 2026-10-12):
                  the .sbtn classes (social-button.css) give them the icon-then-word opening. */}
              <button type="button" className="sbtn ft-btn" onClick={copyEmail} aria-live="polite">
                {copied ? <Check className="sbtn-icon" size={18} aria-hidden="true" /> : <Copy className="sbtn-icon" size={18} aria-hidden="true" />}
                <span className="sbtn-label">{copied ? MICROCOPY.copied : MICROCOPY.copyEmail}</span>
              </button>
              <a className="sbtn ft-btn" href={RESUME} target="_blank" rel="noreferrer">
                <FileText className="sbtn-icon" size={18} aria-hidden="true" />
                <span className="sbtn-label">{MICROCOPY.resumeShort}</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default SiteFooter;
