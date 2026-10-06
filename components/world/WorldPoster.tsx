// The still that stands in for the world on phones, under reduced motion, and while
// the Canvas loads: a faint plan-view drawing of the four rooms, the way a landscape
// architect draws a site before rendering it. Pure SVG, no JavaScript.

export function WorldPoster() {
  return (
    <svg className="world-poster" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M120 640 C 300 560, 420 560, 600 480 S 900 400, 1080 300" strokeDasharray="4 8" />
        <circle cx="180" cy="600" r="120" />
        <circle cx="180" cy="600" r="96" strokeDasharray="2 6" />
        <rect x="90" y="540" width="120" height="34" rx="2" />
        <rect x="100" y="560" width="90" height="26" rx="2" />
        <circle cx="250" cy="540" r="22" /><circle cx="270" cy="660" r="18" /><circle cx="110" cy="650" r="14" />
        <circle cx="520" cy="500" r="110" />
        <rect x="450" y="470" width="150" height="50" rx="2" />
        <circle cx="490" cy="495" r="16" /><rect x="530" y="486" width="34" height="20" rx="1" />
        <circle cx="820" cy="380" r="110" />
        <path d="M720 300 H 920" /><rect x="780" y="330" width="40" height="80" rx="4" />
        <path d="M870 310 v 24 M858 318 h 24" />
        <rect x="740" y="322" width="30" height="6" />
        <circle cx="1080" cy="300" r="110" />
        <rect x="1030" y="340" width="100" height="50" rx="2" strokeDasharray="2 4" />
        <path d="M1000 300 H 1160 M1010 240 v 60 M1150 240 v 60 M1010 240 h 140" />
        <circle cx="1120" cy="365" r="12" />
      </g>
      <g fontFamily="var(--font-mono), ui-monospace, monospace" fontSize="11" letterSpacing="2" fill="currentColor">
        <text x="120" y="745">01 GARDEN / WORK</text>
        <text x="455" y="645">02 KITCHEN / ABOUT</text>
        <text x="750" y="525">03 CLINIC / EXPERIENCE</text>
        <text x="1010" y="445">04 GYM / CONTACT</text>
        <text x="120" y="100">SITE PLAN / NOT TO SCALE</text>
      </g>
    </svg>
  );
}
