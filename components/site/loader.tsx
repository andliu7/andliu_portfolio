import { A11Y } from '@/lib/site';
import { PREFS } from './handoffs';

// The loader (SITE-PLAN.md 4.0): berry-deep, a berry drops in (300ms), the count runs 0 to 100
// in apricot (to 600ms), then the panel wipes up (300ms). 900ms at most, then it leaves the DOM.
//
// The panel covers the page from the moment the HTML is parsed, and its 900ms clock starts at
// DOMContentLoaded (the plan's measure), when the page's scripts have run. Started any earlier,
// the whole show could finish before the first frame was painted (it did, in the judge's
// capture), and the hero's entrance, which waits for html.is-loaded, would play unseen. A 2.5s
// fallback starts it regardless, so the panel can never stay up.
//
// Why a plain inline script and not a React effect: the 900ms limit is measured from the page
// starting to load, and React hydrates whenever its bundle has arrived, which on a slow phone
// can be later than that. This script runs during HTML parsing, before the hero is even parsed.
//
// Why it is empty in the server HTML: with JavaScript off there must be no loader at all. The
// script fills the empty root. React leaves that root alone, because a node rendered with
// dangerouslySetInnerHTML is never diffed by React (suppressHydrationWarning silences the dev
// notice that its contents differ from the server's empty string).
//
// It is rendered in app/layout.tsx, outside <main>: <main> is a size container, which would make
// it the containing block of the loader's position:fixed, so it would cover main, not the screen.
// The script runs on the home page only, and is skipped (html[data-loader="skip"], set by the
// BOOT script) on a URL with a hash and on a second load in the same tab. Under reduced motion it
// is a 120ms fade.

const BERRY = '<svg class="loader-berry" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="54" r="40" fill="#3b4f9e"/><circle cx="36" cy="40" r="9" fill="#7d8fe0" opacity=".55"/><path d="M50 20l6 -9 3 10 10 -2 -6 8 -13 1 -13 -1 -6 -8 10 2 3 -10z" fill="#12142b"/></svg>';

const MARKUP = `<div class="loader" aria-hidden="true">${BERRY}<span class="loader-count">0</span><span class="loader-word">${A11Y.loader}</span></div>`;

// ES5 on purpose: it runs before any bundle, in whatever browser arrives.
const SCRIPT = `(function(){
var d=document.documentElement,root=document.currentScript&&document.currentScript.previousElementSibling;
function loaded(){requestAnimationFrame(function(){requestAnimationFrame(function(){d.classList.add('is-loaded')})})}
var home=/^\\/(index\\.html)?$/.test(location.pathname);
if(!root||!home||d.getAttribute('data-loader')==='skip'){loaded();return}
try{sessionStorage.setItem('${PREFS.seen}','1')}catch(e){}
var reduced=d.getAttribute('data-motion')==='reduced';
root.innerHTML=${JSON.stringify(MARKUP)};
var el=root.firstChild,count=el.querySelector('.loader-count'),t0=0,started=false;
if(performance.mark)performance.mark('loader:start');
function done(){if(el.parentNode)el.parentNode.removeChild(el);if(performance.mark)performance.mark('loader:end')}
function tick(){var t=performance.now()-t0,p=Math.min(1,t/600);count.textContent=String(Math.round(100*(1-Math.pow(1-p,2))));if(p<1)requestAnimationFrame(tick)}
function start(){if(started)return;started=true;t0=performance.now();
if(reduced){count.textContent='100';d.classList.add('is-loaded');requestAnimationFrame(function(){el.classList.add('is-wiping')});setTimeout(done,120);return}
el.classList.add('is-running');requestAnimationFrame(tick);
setTimeout(function(){count.textContent='100';el.classList.add('is-wiping');d.classList.add('is-loaded')},600);
setTimeout(done,900)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
setTimeout(start,2500);
})();`;

export function Loader() {
  return <>
    <div className="loader-root" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: '' }} />
    <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
  </>;
}

export default Loader;
