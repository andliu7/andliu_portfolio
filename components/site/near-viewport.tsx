'use client';
import { Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EVENTS } from './handoffs';

// Mounts heavy things (WebGL, big gsap timelines, the island preview) only when they come near
// the viewport, and, with `unmountMargin`, unmounts them again when they are far away, which
// frees their WebGL context. SITE-PLAN.md 2.2.
//
// Use it with a lazy component, so the heavy code is not even downloaded until it is needed:
//
//   const Gallery = lazy(() => import('@/components/ui/morph-gallery'));
//   <NearViewport placeholder={<StaticGallery />} margin="100%" unmountMargin="150%">
//     <Gallery ... />
//   </NearViewport>
//
// React.lazy is code splitting: the import() becomes its own chunk, fetched on first render.
// Suspense shows `fallback` (here the same placeholder) while that chunk downloads, so the
// layout never jumps (CLS stays 0 as long as the placeholder is the same height).
//
// `margin` and `unmountMargin` are CSS lengths applied above and below the viewport ("100%" is
// one viewport height). The mount observer mounts when the element comes within `margin`; the
// unmount observer unmounts when it leaves `unmountMargin`, and remounts if it comes back
// within it while still inside `margin`. Every callback is ignored while html[data-jumping] is
// set (a long jump is passing through), and both observers re-check once the jump lands.

type Props = {
  children: ReactNode;
  placeholder: ReactNode;
  margin?: string;
  unmountMargin?: string;
  className?: string;
  style?: CSSProperties;
};

const jumping = () => document.documentElement.hasAttribute('data-jumping');

export function NearViewport({ children, placeholder, margin = '100%', unmountMargin, className, style }: Props) {
  // A ref holds the wrapper element; reading it does not cause a re-render.
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inMount = false;
    let inOut = false;

    const mountObserver = new IntersectionObserver(([entry]) => {
      if (jumping()) return;
      inMount = entry.isIntersecting;
      if (inMount) setShown(true);
    }, { rootMargin: `${margin} 0px ${margin} 0px` });

    // Without an unmount margin this stays null and the content, once mounted, stays mounted.
    const unmountObserver = unmountMargin
      ? new IntersectionObserver(([entry]) => {
        if (jumping()) return;
        const was = inOut;
        inOut = entry.isIntersecting;
        if (was && !inOut) setShown(false);
        else if (!was && inOut && inMount) setShown(true);
      }, { rootMargin: `${unmountMargin} 0px ${unmountMargin} 0px` })
      : null;

    mountObserver.observe(el);
    unmountObserver?.observe(el);

    // After a long jump: observing again makes each observer report the element's state right
    // now, which is the "re-check only what intersects now" step of jump.ts.
    const recheck = () => {
      mountObserver.unobserve(el); mountObserver.observe(el);
      if (unmountObserver) { unmountObserver.unobserve(el); unmountObserver.observe(el); }
    };
    window.addEventListener(EVENTS.jumpEnd, recheck);

    // The cleanup function runs when the component leaves the page or the margins change.
    return () => {
      window.removeEventListener(EVENTS.jumpEnd, recheck);
      mountObserver.disconnect();
      unmountObserver?.disconnect();
    };
  }, [margin, unmountMargin]);

  return (
    <div ref={ref} className={className} style={style}>
      {shown ? (
        <Suspense fallback={placeholder}>
          <RefreshTriggers />
          {children}
        </Suspense>
      ) : placeholder}
    </div>
  );
}

// Rendered inside the Suspense boundary next to the lazy content. Everything inside one
// boundary appears together, so this effect runs once the real content is on the page. Then the
// pins and triggers below it are re-measured top to bottom, because the content may have a
// different height than the placeholder.
function RefreshTriggers() {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return null;
}

export default NearViewport;
