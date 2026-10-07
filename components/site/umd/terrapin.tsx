import type { ReactNode } from 'react';
import './terrapin.css';

// An original cartoon terrapin deadlifting a barbell, from the approved Umd design
// (fp/project/Umd.dc.html). It is not Testudo and carries no UMD registered mark. Its shirt has
// a cartoon slab-serif M in UMD red with a gold then black outline (Andrew 2026-10-06: "make the
// umd on testudo the actual logo. maybe cartoonized"). The M is an original shape drawn here, not
// a trace of the university's block M: UMD's official marks are not used because the university
// does not permit altered versions of them. Changes from the canvas: the bar, plates and hands sit 24px lower so
// the bar reads at mid thigh, and the arms reach down to it.
//
// The idle animation is CSS only (terrapin.css): everything above the legs (.tp-lift) rises a
// few px and settles on the site's spring, once every 3.6s, like a slow rep. Reduced motion
// stops it. A plain server component: no state, no effects.

// A chunky collegiate M, 60 wide and 44 tall: slab serifs at the top and foot of each leg, and a
// short V, so the open space between the legs survives the outlines.
const SLAB_M = 'M0 0 H18 L30 15 L42 0 H60 V8 H55 V36 H60 V44 H40 V36 H44 V22 L30 32 L16 22 V36 H20 V44 H0 V36 H5 V8 H0 Z';

// `children` is drawn on top of the terrapin in its own coordinates (the sweat drops,
// sweaty-terrapin.tsx). Inside a button the button carries the name, so `label` may be omitted
// and the drawing is then hidden from screen readers.
export function Terrapin({ label, className, children }: { label?: string; className?: string; children?: ReactNode }) {
  return (
    <svg className={`tp ${className ?? ''}`} viewBox="0 0 440 440" {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <ellipse cx="220" cy="410" rx="170" ry="14" fill="#000000" opacity=".2" />
      {/* legs and feet stay planted */}
      <path d="M160 300 q-6 60 -20 86 h40 q8 -40 16 -78 z" fill="#8FB86A" stroke="#000000" strokeWidth="5" strokeLinejoin="round" />
      <path d="M280 300 q6 60 20 86 h-40 q-8 -40 -16 -78 z" fill="#8FB86A" stroke="#000000" strokeWidth="5" strokeLinejoin="round" />
      <ellipse cx="160" cy="390" rx="28" ry="12" fill="#8FB86A" stroke="#000000" strokeWidth="5" />
      <ellipse cx="282" cy="390" rx="28" ry="12" fill="#8FB86A" stroke="#000000" strokeWidth="5" />
      <g className="tp-lift">
        {/* shell, belly and the red shirt */}
        <ellipse cx="220" cy="200" rx="118" ry="120" fill="#6E5A3A" stroke="#000000" strokeWidth="6" />
        <path d="M220 104 l34 30 -14 42 h-40 l-14 -42 z M150 150 l36 -6 14 40 -26 32 -34 -14 z M290 150 l-36 -6 -14 40 26 32 34 -14 z M168 250 l32 -20 20 26 -14 38 -38 -4 z M272 250 l-32 -20 -20 26 14 38 38 -4 z" fill="#8C7550" stroke="#000000" strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="220" cy="245" rx="76" ry="70" fill="#F4E3B5" stroke="#000000" strokeWidth="5" />
        <rect x="168" y="220" width="104" height="70" rx="16" fill="#E21833" stroke="#000000" strokeWidth="5" />
        {/* The slab M, painted three times on one path: a wide black stroke, a gold stroke inside
            it, then the red fill, so it reads as red with a gold rim and a black outer line. */}
        <g transform="translate(190 233)">
          <path d={SLAB_M} fill="none" stroke="#000000" strokeWidth="11" strokeLinejoin="round" />
          <path d={SLAB_M} fill="none" stroke="#FFD200" strokeWidth="6" strokeLinejoin="round" />
          <path d={SLAB_M} fill="#E21833" />
        </g>
        {/* head */}
        <circle cx="220" cy="92" r="58" fill="#8FB86A" stroke="#000000" strokeWidth="6" />
        <circle cx="198" cy="84" r="9" fill="#000000" />
        <circle cx="242" cy="84" r="9" fill="#000000" />
        <circle cx="201" cy="81" r="3" fill="#FFFFFF" />
        <circle cx="245" cy="81" r="3" fill="#FFFFFF" />
        <path d="M200 110 q20 16 40 0" fill="none" stroke="#000000" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="184" cy="104" rx="8" ry="5" fill="#F4A7B9" />
        <ellipse cx="256" cy="104" rx="8" ry="5" fill="#F4A7B9" />
        {/* arms: an ink stroke under a green one, shoulder to hand */}
        <path d="M128 176 q-22 50 -18 120" fill="none" stroke="#000000" strokeWidth="30" strokeLinecap="round" />
        <path d="M128 176 q-22 50 -18 120" fill="none" stroke="#8FB86A" strokeWidth="20" strokeLinecap="round" />
        <path d="M312 176 q22 50 18 120" fill="none" stroke="#000000" strokeWidth="30" strokeLinecap="round" />
        <path d="M312 176 q22 50 18 120" fill="none" stroke="#8FB86A" strokeWidth="20" strokeLinecap="round" />
        {/* the bar at mid thigh, two plates a side, then the hands over it */}
        <g transform="translate(0 24)">
          <rect x="20" y="272" width="400" height="12" rx="6" fill="#B8B8C0" stroke="#000000" strokeWidth="4" />
          <rect x="28" y="222" width="30" height="112" rx="8" fill="#9A9AA4" stroke="#000000" strokeWidth="5" />
          <rect x="62" y="236" width="22" height="84" rx="7" fill="#B8B8C0" stroke="#000000" strokeWidth="5" />
          <rect x="382" y="222" width="30" height="112" rx="8" fill="#9A9AA4" stroke="#000000" strokeWidth="5" />
          <rect x="356" y="236" width="22" height="84" rx="7" fill="#B8B8C0" stroke="#000000" strokeWidth="5" />
          <circle cx="110" cy="278" r="16" fill="#8FB86A" stroke="#000000" strokeWidth="5" />
          <circle cx="330" cy="278" r="16" fill="#8FB86A" stroke="#000000" strokeWidth="5" />
        </g>
      </g>
      {children}
    </svg>
  );
}

export default Terrapin;
