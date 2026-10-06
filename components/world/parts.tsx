'use client';
import { MeshStandardMaterial } from 'three';

// Primitive building blocks for the rooms. Every room is boxes, cylinders and
// spheres until real Blender models replace them; a room file should read like
// a parts list, not like Three.js code.
//
// Materials are cached per colour so the whole world shares a handful of GPU
// programs instead of one per mesh.

const cache = new Map<string, MeshStandardMaterial>();
export function material(color: string) {
  let m = cache.get(color);
  if (!m) { m = new MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 }); cache.set(color, m); }
  return m;
}

type V3 = [number, number, number];
type Common = { color: string; position?: V3; rotation?: V3 };

export function Box({ size, color, position, rotation }: Common & { size: V3 }) {
  return <mesh castShadow receiveShadow position={position} rotation={rotation} material={material(color)}><boxGeometry args={size} /></mesh>;
}
export function Cyl({ r, h, color, position, rotation, top, segments = 24 }: Common & { r: number; h: number; top?: number; segments?: number }) {
  return <mesh castShadow receiveShadow position={position} rotation={rotation} material={material(color)}><cylinderGeometry args={[top ?? r, r, h, segments]} /></mesh>;
}
export function Sphere({ r, color, position, squash = 1 }: Common & { r: number; squash?: number }) {
  return <mesh castShadow receiveShadow position={position} scale={[1, squash, 1]} material={material(color)}><sphereGeometry args={[r, 18, 14]} /></mesh>;
}
export function Blob({ r, color, position }: Common & { r: number }) {
  return <mesh castShadow receiveShadow position={position} material={material(color)}><icosahedronGeometry args={[r, 0]} /></mesh>;
}
export function Ring({ r, tube, color, position, rotation }: Common & { r: number; tube: number }) {
  return <mesh castShadow receiveShadow position={position} rotation={rotation} material={material(color)}><torusGeometry args={[r, tube, 10, 20]} /></mesh>;
}
