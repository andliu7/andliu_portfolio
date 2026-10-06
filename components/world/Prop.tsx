'use client';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody, type RigidBodyAutoCollider } from '@react-three/rapier';
import { Vector3 } from 'three';
import { sound } from './sound';

// A Prop is anything in a room you can point at. Dynamic props also have physics:
// a click flicks them, they tumble, and they teleport home if they fall off the island.
//
// Captions are raised through a context rather than props so a room file never has
// to thread an onCaption callback through every nested group.

export type Caption = { label: string; x: number; y: number } | null;
export const CaptionContext = createContext<(c: Caption) => void>(() => {});

type Props = {
  position: [number, number, number];
  rotation?: [number, number, number];
  label?: string;
  voice?: 'clink' | 'clank';
  fixed?: boolean;
  colliders?: RigidBodyAutoCollider;
  children: ReactNode;
};

export function Prop({ position, rotation, label, voice = 'clink', fixed = false, colliders = 'cuboid', children }: Props) {
  const body = useRef<RapierRigidBody>(null);
  const setCaption = useContext(CaptionContext);
  const home = useMemo(() => new Vector3(...position), [position]);

  useFrame(() => {
    const b = body.current;
    if (!b || fixed) return;
    if (b.translation().y < -4) {
      b.setTranslation(home, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    if (label) setCaption({ label, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (label) setCaption({ label, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
  };
  const out = () => { document.body.style.cursor = ''; setCaption(null); };
  const flick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    sound.play(voice);
    const b = body.current;
    if (!b || fixed) return;
    const dir = new Vector3().subVectors(e.point, e.ray.origin).setY(0).normalize();
    const m = b.mass();
    b.applyImpulse({ x: dir.x * 2.4 * m, y: 3.2 * m, z: dir.z * 2.4 * m }, true);
    b.applyTorqueImpulse({ x: (Math.random() - 0.5) * m, y: (Math.random() - 0.5) * m, z: (Math.random() - 0.5) * m }, true);
  };

  return (
    <RigidBody ref={body} type={fixed ? 'fixed' : 'dynamic'} colliders={colliders} position={position} rotation={rotation}>
      <group onPointerOver={over} onPointerMove={move} onPointerOut={out} onPointerDown={flick}>{children}</group>
    </RigidBody>
  );
}
