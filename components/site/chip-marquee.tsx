'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './chip-marquee.css';

// A one-line pill of text (the degree chip: in the header on a wide screen, in the hero on a
// phone). When the whole line fits it sits still. When it does not, it becomes a slow marquee
// inside its own pill, with its edges fading out, instead of wrapping or cutting off mid-word.
// Screen readers read the sr-only copy once; the moving copies are aria-hidden.
// Reduced motion: no scroll, the line stays put and fades out at the right edge.
//
// Pattern: a ResizeObserver on the pill decides `moving` (does the text overflow?). Changing
// that state re-renders once with a second copy of the text for the seamless loop; the motion
// itself is a CSS animation, so nothing re-renders while it plays.

const PX_PER_SECOND = 28;

export function ChipMarquee({ text, className = '' }: { text: string; className?: string }) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [run, setRun] = useState(0); // 0 when it fits; otherwise the width of one pass in px

  useEffect(() => {
    const box = boxRef.current;
    const line = textRef.current;
    if (!box || !line) return;
    const check = () => {
      // the text's width without its loop gap, against the room inside the pill's padding
      const room = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) * 2;
      const width = line.scrollWidth - parseFloat(getComputedStyle(line).paddingRight || '0');
      setRun(width > room + 1 ? Math.round(line.offsetWidth) : 0);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(box);
    document.fonts.ready.then(check);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={boxRef} className={`chipm ${className}`} data-moving={run ? '' : undefined}
      style={run ? { '--chipm-dur': `${(run / PX_PER_SECOND).toFixed(1)}s` } as CSSProperties : undefined}>
      <span className="sr-only">{text}</span>
      <span className="chipm-track" aria-hidden="true">
        <span ref={textRef} className="chipm-text">{text}</span>
        {run ? <span className="chipm-text">{text}</span> : null}
      </span>
    </span>
  );
}

export default ChipMarquee;
