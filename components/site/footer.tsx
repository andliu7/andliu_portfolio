'use client';
import { useEffect, useRef, useState } from 'react';
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
                <a key={link.href} className="ft-btn" href={link.href} target="_blank" rel="noreferrer">
                  {link.icon === 'github' ? <GitHubIcon /> : <LinkedInIcon />}
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// lucide dropped its brand icons, so these two are inline: GitHub's mark (the same path as the
// guide's footer) and LinkedIn's "in".
function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.02-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.21.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

export default SiteFooter;
