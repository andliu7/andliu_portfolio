'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { sound } from './sound';

// The camera is driven by the page's scroll position, nothing else. Each page section
// has a camera key; between keys the camera eases along a gentle arc. The scene never
// touches React state on scroll: it reads window.scrollY every frame and lerps.

export const ROOM_GAP = 15;
// Camera keys sit at the vistas: the transparent gaps between page sections.
const SECTIONS = ['top', 'room-garden', 'room-kitchen', 'room-clinic', 'room-gym'];
const KEYS = [
  { pos: [-9.5, 7.5, 17.5], look: [-1.5, 0.2, 0] },
  { pos: [-4.4, 5.6, 11.5], look: [-1.6, 0.5, 0] },
  { pos: [ROOM_GAP * 1 - 4.4, 5.4, 11.0], look: [ROOM_GAP * 1 - 1.6, 0.7, -0.3] },
  { pos: [ROOM_GAP * 2 - 4.2, 5.2, 11.0], look: [ROOM_GAP * 2 - 1.8, 1.0, -0.8] },
  { pos: [ROOM_GAP * 3 - 4.4, 5.6, 11.5], look: [ROOM_GAP * 3 - 1.6, 0.6, 0] },
] as const;

const ease = (t: number) => t * t * (3 - 2 * t);

export function ScrollCamera() {
  const camera = useThree(s => s.camera);
  const marks = useRef<number[]>([0]);
  const pos = useRef(new Vector3());
  const look = useRef(new Vector3());
  const target = useRef(new Vector3());
  const targetLook = useRef(new Vector3());
  const room = useRef(-2);
  const first = useRef(true);

  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight;
      marks.current = SECTIONS.map(id => {
        const el = document.getElementById(id);
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return r.top + window.scrollY + r.height * 0.5 - vh * 0.5;
      });
      marks.current[0] = 0;
    };
    measure();
    window.addEventListener('resize', measure);
    const t = window.setTimeout(measure, 800);
    return () => { window.removeEventListener('resize', measure); window.clearTimeout(t); };
  }, []);

  useFrame((state, dt) => {
    const y = window.scrollY;
    const m = marks.current;
    let i = 0;
    while (i < m.length - 2 && y > m[i + 1]) i++;
    const span = Math.max(1, m[i + 1] - m[i]);
    const t = ease(Math.min(1, Math.max(0, (y - m[i]) / span)));
    const a = KEYS[i], b = KEYS[i + 1];
    target.current.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * t,
      a.pos[1] + (b.pos[1] - a.pos[1]) * t + Math.sin(t * Math.PI) * 1.2,
      a.pos[2] + (b.pos[2] - a.pos[2]) * t,
    );
    targetLook.current.set(
      a.look[0] + (b.look[0] - a.look[0]) * t,
      a.look[1] + (b.look[1] - a.look[1]) * t,
      a.look[2] + (b.look[2] - a.look[2]) * t,
    );
    const now = t > 0.5 ? i : i - 1;
    if (now !== room.current) { if (room.current !== -2) sound.play('tap'); room.current = now; }

    const k = first.current ? 1 : 1 - Math.exp(-dt * 6);
    first.current = false;
    pos.current.lerp(target.current, k);
    look.current.lerp(targetLook.current, k);
    camera.position.set(pos.current.x + state.pointer.x * 0.35, pos.current.y + state.pointer.y * 0.2, pos.current.z);
    camera.lookAt(look.current);
  });

  return null;
}
