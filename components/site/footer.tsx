'use client';
import { useEffect, useRef, useState } from 'react';
import { SocialButton } from './social-button';
import { usePathname } from 'next/navigation';
import { Briefcase, ChartColumn, Coffee, FileText, LayoutGrid, Mail } from 'lucide-react';
import { A11Y, FOOTER_SKIP, MICROCOPY } from '@/lib/site';
import { getLenis } from '@/app/smooth';
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

const ICONS = { work: LayoutGrid, impact: ChartColumn, experience: Briefcase, resume: FileText, email: Mail, fun: Coffee } as const;

export function SiteFooter() {
  const home = usePathname() === '/';
  const at = (href: string) => (!home && href.startsWith('#') ? `/${href}` : href);
  const seamRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLElement>(null);
  const [fits, setFits] = useState(false);

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
            <a className="ft-mark" href={home ? '#top' : '/'} aria-label={A11Y.home}><Mark /></a>
            <p className="ft-blurb">{FOOTER_SKIP.blurb}</p>
            <p className="ft-meta">{FOOTER_SKIP.copyright}<br />{MICROCOPY.credits}</p>
            <div className="ft-social">
              {FOOTER_SKIP.social.map(link => (
                <SocialButton key={link.href} className="ft-btn" href={link.href} label={link.label} kind={link.icon} />
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default SiteFooter;
