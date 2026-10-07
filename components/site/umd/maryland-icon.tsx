// A flat cartoon of the state of Maryland for the UMD section's top right corner (Andrew
// 2026-10-06: "include an icon of the maryland state top right of the screen that tilts when
// hover"). An original, simplified outline: the thin western panhandle under the straight
// northern border, the Potomac running down to the southern tip, the Chesapeake Bay cut up the
// middle (painted as water), and the Eastern Shore down to the Atlantic. Gold with an ink outline
// and a ledge shadow, and a red star roughly where College Park sits. Decorative: the section hides it from
// screen readers. A plain server component; the tilt is TiltFrame around it (umd.tsx).

const OUTLINE =
  'M4 12 H150 V58 H180 L174 84 L170 100 L138 104 H108 Q96 98 94 84 Q90 66 84 58 Q72 46 56 42 Q40 34 28 34 Q18 26 4 28 Z';

// The Chesapeake Bay, painted as water over the state from its mouth in the south up to the
// Susquehanna at the top, so the outline stays one clean shape.
const BAY = 'M108 104 Q112 86 114 72 Q118 56 120 44 Q124 30 128 16 L133 16 Q133 32 130 44 Q135 58 128 70 Q136 84 130 92 L138 104 Z';

// A five-point star, centred on 0,0, radius 9.
const STAR = 'M0 -9 L2.6 -3.2 L8.6 -2.8 L4 1.2 L5.3 7.3 L0 4 L-5.3 7.3 L-4 1.2 L-8.6 -2.8 L-2.6 -3.2 Z';

export function MarylandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 186 116" aria-hidden="true">
      <path d={OUTLINE} transform="translate(3 5)" fill="#000000" strokeLinejoin="round" stroke="#000000" strokeWidth="4" />
      <path d={OUTLINE} fill="#FFD200" stroke="#000000" strokeWidth="4" strokeLinejoin="round" />
      <path d={BAY} fill="#8FD3FF" stroke="#000000" strokeWidth="3" strokeLinejoin="round" />
      <path d={STAR} transform="translate(90 50)" fill="#E21833" stroke="#000000" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export default MarylandIcon;
