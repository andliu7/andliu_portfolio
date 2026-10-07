'use client';
import { useRef, useState } from 'react';
import { Terrapin } from './terrapin';

// The terrapin as a button (Andrew 2026-10-06): click it, or press Enter or Space on it, and a
// bead of sweat appears at his brow, slides off his head and drops to the floor with a small
// splash. Reduced motion: the bead appears and fades where it is (terrapin.css).
//
// Each press adds a drop with its own id; the drop removes itself when its fall animation ends
// (onAnimationEnd), so a few quick presses give a few drops in flight. useRef holds the next id:
// it is a counter that never needs to show on screen, so changing it must not re-render.

export function SweatyTerrapin({ label, className }: { label: string; className?: string }) {
  const [drops, setDrops] = useState<number[]>([]);
  const next = useRef(0);
  const sweat = () => setDrops(list => [...list.slice(-4), next.current++]);
  const done = (id: number) => setDrops(list => list.filter(d => d !== id));

  return (
    <button type="button" className={`tp-button ${className ?? ''}`} aria-label={label} onClick={sweat}>
      <Terrapin>
        {drops.map(id => (
          <g key={id}>
            <g transform="translate(258 58)">
              <g className="tp-drop" onAnimationEnd={() => done(id)}>
                <path d="M0 -13 C5 -5 9 0 9 5 A9 9 0 0 1 -9 5 C-9 0 -5 -5 0 -13 Z" fill="#8FD3FF" stroke="#000000" strokeWidth="3" strokeLinejoin="round" />
                <circle cx="-3" cy="3" r="2.2" fill="#FFFFFF" />
              </g>
            </g>
            <g transform="translate(298 404)">
              <g className="tp-splash" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round">
                <path d="M-18 0 Q-24 -8 -26 -14 M18 0 Q24 -8 26 -14 M0 -4 V-18" />
                <ellipse cx="0" cy="2" rx="14" ry="4" fill="#8FD3FF" />
              </g>
            </g>
          </g>
        ))}
      </Terrapin>
    </button>
  );
}

export default SweatyTerrapin;
