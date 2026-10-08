import type { Metadata } from 'next';
import { Antic, Fira_Code, Karla } from 'next/font/google';
import { META, MICROCOPY } from '@/lib/site';
import { PREFS } from '@/components/site/handoffs';
import { Header } from '@/components/site/header';
import { Loader } from '@/components/site/loader';
import ChatDock from '@/components/chat/chat-dock';
import MascotSlot from '@/components/mascot/mascot-slot';
import './globals.css';

// Three voices (plan 3.1's two, plus Karla for reading, 2026-10-06):
//   Fira Code  display and labels: the big bold titles (700), eyebrows, captions, buttons
//   Karla      reading: body copy at 500 (Antic 400 was too thin to read in long runs)
//   Antic      the one keyword accent inside two-voice headings
// display: 'swap' shows the fallback at once, so the loader never waits on fonts; next/font adds a
// metric-matched fallback, so the swap barely moves anything.
const karla = Karla({ weight: ['400', '500', '700'], variable: '--font-karla', subsets: ['latin'], display: 'swap' });
const fira = Fira_Code({ weight: ['500', '600', '700'], variable: '--font-fira', subsets: ['latin'], display: 'swap' });
const antic = Antic({ weight: '400', variable: '--font-antic', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://andliu.dev'),
  alternates: { canonical: '/' },
  title: META.title,
  description: META.description,
  // The tab icon is the AND/LIU mark (public/favicon.svg, letters drawn as Fredoka 700 paths, since
  // an SVG favicon cannot load a web font). The 32px PNG is for browsers without SVG favicons.
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/icon-32.png', type: 'image/png', sizes: '32x32' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: { title: META.title, description: META.description, type: 'website', locale: 'en_US' },
};

// BOOT: runs in <head>, before first paint.
//  - html.js: JavaScript is on, so the hidden start states of reveals may apply.
//  - html[data-motion="reduced"]: from the stored Motion switch, else from the OS setting. Every
//    reduced-motion rule on the site reads this attribute, so the switch and the OS are one thing.
//  - html[data-mascot="off"]: the visitor turned the following berry off in the menu.
//  - html[data-loader="skip"]: the URL has a hash, or the loader already played in this tab.
//    Storage reads are in try/catch; a throw means "not seen", so the loader shows.
//  - is-loaded after 5s regardless, in case nothing else ever sets it (the loader lifts by 5s at
//    the latest: its 3.5s cap plus a 1.5s timer for a tab that gets no animation frames).
//  - reveal-off after 6s if the director never started (its bundle failed): every hidden
//    [data-reveal] start state is gated on its absence, so the text can never stay invisible.
const BOOT = `(function(){var d=document.documentElement;d.classList.add('js');
var m=null;try{m=localStorage.getItem('${PREFS.motion}')}catch(e){}
var r=m==='reduced'||(m!=='full'&&window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
if(r)d.setAttribute('data-motion','reduced');
var k=null;try{k=localStorage.getItem('${PREFS.mascot}')}catch(e){}
if(k==='off')d.setAttribute('data-mascot','off');
var s=false;try{s=!!sessionStorage.getItem('${PREFS.seen}')}catch(e){}
if(location.hash||s)d.setAttribute('data-loader','skip');
setTimeout(function(){d.classList.add('is-loaded')},5000);
setTimeout(function(){if(!d.classList.contains('motion-ready'))d.classList.add('reveal-off')},6000);})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: BOOT changes <html>'s classes and attributes before React
    // hydrates, and components/site/section-state.ts keeps changing data-section and data-ground
    // after.
    // The font variables live on <html> because globals.css reads them on :root.
    <html lang="en" className={`${karla.variable} ${fira.variable} ${antic.variable}`} data-ground="paper" data-section="top" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: BOOT }} /></head>
      <body>
        <a className="skip-link" href="#main">{MICROCOPY.skip}</a>
        <Loader />
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        <ChatDock />
        <MascotSlot />
      </body>
    </html>
  );
}
