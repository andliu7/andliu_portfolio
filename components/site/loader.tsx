import { A11Y } from '@/lib/site';
import { PREFS } from './handoffs';

// The loader (SITE-PLAN.md 4.0): a count from 0 to 100 over a berry sheet, then a pan. Reworked
// 2026-10-07 (Andrew: "force the load page to go to a hundred and try to actually at least load
// in the first page before the rest of it").
//
// The count is real. It follows what the first screen needs, each worth part of the 100:
//   dom       15  the HTML is parsed (DOMContentLoaded)
//   fonts     25  the hero's two faces are loaded (document.fonts.load also starts the download)
//   hydrated  30  React is running (the director in app/motion.tsx sets html.motion-ready)
//   fit       15  the hero name is sized (HeroFit in hero.client.tsx sets --fs-js on .hero-stage)
//   sky       10  two frames have painted since React mounted the Cloudscape sky's WebGL
//   settled   25  after React is up, 12 frames in a row came under 25ms: the main thread is free,
//                 so the scroll effects are set up and the first scroll is smooth (Andrew
//                 2026-10-07: "I have to wait ... to even be able to scroll smoothly")
// The number on screen eases toward that total every frame, so it never jumps and never goes
// backwards. Three clocks bound it, all measured from when this script runs:
//   MIN_MS   the sheet stays at least this long, so a fast cached load does not flash
//   CAP_MS   whatever is still missing, the count runs smoothly on to 100 from here, so a slow
//            network never traps anyone behind the sheet
//   HOLD_MS  at 100 it holds the full number this long, then the sheets pan off to the left
//            (translateX, 720ms on --ease-wipe, the back sheet 70ms behind) and html.is-loaded
//            starts the hero's entrance. The sheet leaves the DOM 900ms later.
// A background tab gets no animation frames, and a slow phone's main thread can be blocked for
// seconds while React hydrates, so a timer lifts the sheet regardless at CAP_MS + 1.5s (the
// number snaps to 100 as it goes; measured 2026-10-07, a 4x-throttled phone profile reached it).
//
// Reduced motion (html[data-motion="reduced"]): no count, a still sheet with the berry and the
// name, lifted (a 120ms fade) as soon as the hero is ready, or at CAP_MS.
//
// Why a plain inline script and not a React effect: it must be on screen while React's bundle
// is still downloading, and it is what watches React arrive. It runs during HTML parsing.
//
// Why it is empty in the server HTML: with JavaScript off there must be no loader at all. The
// script fills the empty root. React leaves that root alone, because a node rendered with
// dangerouslySetInnerHTML is never diffed by React (suppressHydrationWarning silences the dev
// notice that its contents differ from the server's empty string).
//
// It is rendered in app/layout.tsx, outside <main>: <main> is a size container, which would make
// it the containing block of the loader's position:fixed, so it would cover main, not the screen.
// The script runs on the home page only, and is skipped (html[data-loader="skip"], set by the
// BOOT script) on a URL with a hash and on a second load in the same tab.
//
// The sheet and berry styles are in app/globals.css (.loader). The count's own two rules ride
// in the injected markup below, so the count stays in this one file.
//
// Performance marks for the perf harness: loader:start, loader:lift (the pan starts and the hero
// is uncovered), loader:end.

const MIN_MS = 1200;
const CAP_MS = 7000;
const HOLD_MS = 160;

const BERRY = '<svg class="loader-berry" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="54" r="40" fill="#3b4f9e"/><circle cx="36" cy="40" r="9" fill="#7d8fe0" opacity=".55"/><path d="M50 20l6 -9 3 10 10 -2 -6 8 -13 1 -13 -1 -6 -8 10 2 3 -10z" fill="#12142b"/></svg>';

// tabular-nums keeps every digit one width, so the number does not wobble as it counts.
const STYLE = '<style>.loader-count{position:absolute;right:var(--gutter);bottom:var(--gutter);font:700 clamp(64px,14vw,180px)/.84 var(--display);letter-spacing:-.04em;font-variant-numeric:tabular-nums;color:var(--paper)}html[data-motion="reduced"] .loader-count{display:none}</style>';

const MARKUP = `<div class="loader" aria-hidden="true">${STYLE}<div class="loader-sheet loader-sheet-back"></div><div class="loader-sheet loader-sheet-front">${BERRY}<span class="loader-word">${A11Y.loader}</span><span class="loader-count">0</span></div></div>`;

// ES5 on purpose: it runs before any bundle, in whatever browser arrives. Reading el.offsetWidth
// before adding is-wiping forces a style pass, so the sheets have a start position to transition
// from even if no frame was painted yet (otherwise they would jump straight off screen).
const SCRIPT = `(function(){
var d=document.documentElement,root=document.currentScript&&document.currentScript.previousElementSibling;
var P=window.performance;function mark(n){if(P&&P.mark)P.mark(n)}
function loaded(){requestAnimationFrame(function(){requestAnimationFrame(function(){d.classList.add('is-loaded')})})}
var home=/^\\/(index\\.html)?$/.test(location.pathname);
if(!root||!home||d.getAttribute('data-loader')==='skip'){loaded();return}
try{sessionStorage.setItem('${PREFS.seen}','1')}catch(e){}
var reduced=d.getAttribute('data-motion')==='reduced';
root.innerHTML=${JSON.stringify(MARKUP)};
var el=root.firstChild,num=el.querySelector('.loader-count'),t0=Date.now();
mark('loader:start');
var W={dom:10,fonts:20,hydrated:25,fit:10,sky:10,settled:25},got={},frames=0,smooth=0,last=0,shown=0,full=0,lifted=false;
function have(k){got[k]=true}
if(document.readyState!=='loading')have('dom');else document.addEventListener('DOMContentLoaded',function(){have('dom')});
try{Promise.all([document.fonts.load('700 1em "Fira Code"'),document.fonts.load('500 1em "Karla"')]).then(function(){have('fonts')},function(){have('fonts')})}catch(e){have('fonts')}
function poll(){
if(!got.hydrated&&d.classList.contains('motion-ready'))have('hydrated');
if(got.dom&&!got.fit){var s=document.querySelector('.hero-stage');if(!s||s.style.getPropertyValue('--fs-js'))have('fit')}
if(got.hydrated&&!got.sky&&++frames>2)have('sky');
var t=P&&P.now?P.now():Date.now();if(got.sky&&!got.settled){smooth=last&&t-last<25?smooth+1:0;if(smooth>=12)have('settled')}last=t}
function target(now){if(now-t0>=${CAP_MS})return 100;var t=0;for(var k in W)if(got[k])t+=W[k];return t}
function done(){if(el.parentNode)el.parentNode.removeChild(el);mark('loader:end')}
function lift(){if(lifted)return;lifted=true;mark('loader:lift');
if(reduced){d.classList.add('is-loaded');el.classList.add('is-wiping');setTimeout(done,120);return}
num.textContent='100';el.offsetWidth;el.classList.add('is-wiping');d.classList.add('is-loaded');setTimeout(done,900)}
function tick(){if(lifted)return;var now=Date.now();poll();var t=target(now);
if(reduced){if(t>=100)lift();else requestAnimationFrame(tick);return}
shown=Math.min(t,shown+Math.max((t-shown)*0.09,0.4));
var n=Math.floor(shown);if(num.textContent!==String(n))num.textContent=n;
if(n>=100&&now-t0>=${MIN_MS}){if(!full)full=now;else if(now-full>=${HOLD_MS}){lift();return}}
requestAnimationFrame(tick)}
requestAnimationFrame(function(){if(!reduced)el.classList.add('is-running');tick()});
setTimeout(lift,${CAP_MS + 1500});
})();`;

export function Loader() {
  return <>
    <div className="loader-root" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: '' }} />
    <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
  </>;
}

export default Loader;
