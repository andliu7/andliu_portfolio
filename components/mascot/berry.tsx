// The mascot's art: Blueberry's own mark (grignard-app-source src/components/ui/blueberry-mark.tsx:
// 64x64, body r23 at y34, the five-petal calyx squashed to 0.62, tall oval eyes with a catchlight
// high on the left, kind arcs, a shallow wide smile, blush under the eyes) with the same
// proportions, drawn flat in Stage tokens: the source's gradients become a body colour plus a
// second flat shape for the shade, as the andliu Play style draws.
//
// A plain SVG with no state and no motion, so anything can render it still. The face is chosen by
// `mood` and drawn by mascot.css as [data-mood] rules; `blink` squeezes the open eyes shut for a
// beat. The calyx is its own <g> so the moving cursor can swing it (follow-through).

export type BerryMood = 'rest' | 'curious' | 'happy' | 'cheer' | 'shy' | 'sleepy' | 'asleep';

const PETAL = 'M0 -11 C2.8 -6.7 3.7 -2.8 2.6 0 C1.6 2.2 -1.6 2.2 -2.6 0 C-3.7 -2.8 -2.8 -6.7 0 -11 Z';

type Props = {
  mood?: BerryMood;
  blink?: boolean;
  size?: number;
  title?: string;
  className?: string;
};

export function Berry({ mood = 'rest', blink = false, size = 32, title, className }: Props) {
  return (
    <svg
      className={`berry ${className ?? ''}`}
      data-mood={mood}
      data-blink={blink ? '' : undefined}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* A paper halo, so the berry still reads on the berry and ink grounds. */}
      <circle cx="32" cy="34" r="25" fill="var(--paper)" />
      <circle cx="32" cy="34" r="23" fill="var(--berry-2, #5b6fd6)" />
      {/* The shade toward the base, flat instead of the source's radial gradient. */}
      <path d="M53.2 26 A23 23 0 0 1 14 49.2 A21 21 0 0 0 53.2 26 Z" fill="var(--berry)" />
      <ellipse cx="19" cy="26" rx="6" ry="4.1" fill="#ffffff" opacity=".3" transform="rotate(-30 19 26)" />
      <g transform="translate(32 15.5)">
        {/* Outer <g> places the calyx; the inner one is free for the swing. */}
        <g className="berry-calyx">
          <g transform="scale(1 .62)" fill="var(--berry-deep)">
            {[0, 72, 144, 216, 288].map(turn => <path key={turn} d={PETAL} transform={`rotate(${turn})`} />)}
            <circle r="3.6" fill="var(--ink)" />
          </g>
        </g>
      </g>
      <g className="berry-blush" fill="var(--tile-pink)">
        <ellipse cx="19.5" cy="40" rx="4.2" ry="2.6" />
        <ellipse cx="44.5" cy="40" rx="4.2" ry="2.6" />
      </g>
      <g className="berry-eyes">
        <ellipse cx="23.5" cy="33" rx="3.2" ry="5.7" fill="var(--ink)" />
        <ellipse cx="40.5" cy="33" rx="3.2" ry="5.7" fill="var(--ink)" />
        <ellipse cx="22.4" cy="30.4" rx="1" ry="1.5" fill="#ffffff" opacity=".9" />
        <ellipse cx="39.4" cy="30.4" rx="1" ry="1.5" fill="#ffffff" opacity=".9" />
      </g>
      {/* Kind eyes (happy, cheer, shy): arcs bulging upward. Closed (asleep): arcs the other way. */}
      <path className="berry-kind" d="M19.2 34.6 Q23.5 29.5 27.8 34.6 M36.2 34.6 Q40.5 29.5 44.8 34.6" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      <path className="berry-closed" d="M19.2 32.5 Q23.5 36.5 27.8 32.5 M36.2 32.5 Q40.5 36.5 44.8 32.5" fill="none" stroke="var(--ink)" strokeWidth="2.3" strokeLinecap="round" />
      <path className="berry-smile" d="M26.5 42.4 Q32 46.2 37.5 42.4" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse className="berry-o" cx="32" cy="44" rx="2.1" ry="2.5" fill="var(--ink)" />
      <path className="berry-cheer" d="M26.5 41.5 h11 q0 6.5 -5.5 6.5 q-5.5 0 -5.5 -6.5 z" fill="var(--ink)" />
      <path className="berry-flat" d="M29 44 h6" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default Berry;
