// The chat's berry: Blueberry's own mark (src/components/ui/blueberry-mark.tsx geometry: 64x64,
// body r23, the five-petal calyx squashed to 0.62) redrawn flat in /andliu tokens, with a face.
// The face is set by `mood`, read by chat.css as [data-mood]; blinking and bobbing are CSS too,
// so this file has no state and no motion library. Decoration only (aria-hidden).

export type ChatMood = 'rest' | 'happy' | 'thinking' | 'reading' | 'shy';

const PETAL = 'M0 -11 C2.8 -6.7 3.7 -2.8 2.6 0 C1.6 2.2 -1.6 2.2 -2.6 0 C-3.7 -2.8 -2.8 -6.7 0 -11 Z';

export function ChatBerry({ mood = 'rest', className }: { mood?: ChatMood; className?: string }) {
  return (
    <svg className={`chat-berry ${className ?? ''}`} data-mood={mood} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="34" r="23" fill="var(--berry)" />
      {/* The crescent shade at the lower right, flat instead of a gradient. */}
      <path d="M50.5 22.5 A23 23 0 0 1 22 54.8 A25 25 0 0 0 50.5 22.5 Z" fill="var(--berry-deep)" />
      <ellipse cx="19" cy="26" rx="6" ry="4.1" fill="var(--paper)" opacity=".3" transform="rotate(-30 19 26)" />
      <g fill="var(--berry-deep)" transform="translate(32 15.5) scale(1 .62)">
        {[0, 72, 144, 216, 288].map(turn => <path key={turn} d={PETAL} transform={`rotate(${turn})`} />)}
        <circle r="3.6" fill="var(--ink)" />
      </g>
      <g className="chat-berry-blush" fill="var(--tile-pink, #d6689a)" opacity=".5">
        <ellipse cx="19.5" cy="41" rx="4.2" ry="2.6" />
        <ellipse cx="44.5" cy="41" rx="4.2" ry="2.6" />
      </g>
      <g className="chat-berry-face">
        {/* Open eyes (rest, thinking, reading): dots with a paper glint; they blink. */}
        <g className="chat-berry-eyes">
          <circle cx="24" cy="35" r="3.2" fill="var(--ink)" />
          <circle cx="40" cy="35" r="3.2" fill="var(--ink)" />
          <circle cx="25.1" cy="33.9" r="1" fill="var(--paper)" />
          <circle cx="41.1" cy="33.9" r="1" fill="var(--paper)" />
        </g>
        {/* Kind eyes (happy, shy): two arcs. */}
        <path className="chat-berry-kind" d="M20.5 36 q3.5 -4 7 0 M36.5 36 q3.5 -4 7 0" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" />
        <path className="chat-berry-smile" d="M28 42 q4 3.6 8 0" fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse className="chat-berry-o" cx="32" cy="43" rx="2" ry="2.4" fill="var(--ink)" />
      </g>
    </svg>
  );
}
