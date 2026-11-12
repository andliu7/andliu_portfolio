'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { S, townLayout, type TownLayout } from './town-layout';
import { isle, isleU, keyDir, KEY_ELEV } from './island-shading';

// The résumé island as a 3D diorama in a night sea that runs to the horizon, in #island (Andrew
// 2026-11-03: "give the island a real shape with real 3D-ness ... where the major pieces are
// enlarged", "I like having the island actually be a circle", "it's in the middle of water, the
// water extends to the horizon", then "make it look like the actual island from the game").
//
// The map is the game's own (town-layout.ts ports public/island/src/world/map.js): a round,
// softly squared coast with three sea coves and the dock harbour, the central lake draining three
// ways to the sea so turquoise rivers split the island into lobes, two smaller lakes and a creek,
// islets offshore, the outer road loop, the lake loop and the spokes from the plaza in dark plum
// asphalt with amber dashes on sand shoulders, and a coral-railed wooden bridge wherever a road
// crosses water. The eight résumé landmarks stand at their zones (zones.js) at about the game's own
// size (LANDMARK_SCALE), small props on a wide island, so the land, the water and the roads are
// what the eye reads first, as in the game's overview; each keeps its game look (houses.js): the blueberry dome,
// the glass vault, the sawtooth roof and reel, the lighthouse, the bell tower, the cupola and
// arch, the turning tooth, the steeple. Clumped trees, grass tufts and road lanterns are
// instanced, so the whole town is a few dozen draw calls.
//
// The canvas covers the whole #island section (island.css); the camera is framed so the island
// lands in the stage box beside the words (Framing). Above the horizon the canvas is transparent,
// so the page's own sky and CSS stars show through. Each landmark's screen box is written each
// frame to a button the stage draws over the scene (marks), so the buildings can be clicked,
// hovered and tabbed to for their names.
//
// Plain three.js primitives and flat colours: no models, no textures, no drei. Loaded lazily by
// island-stage.tsx, only near the viewport, so three.js never touches first load. `still`
// (reduced motion) draws one frame and never animates.

/* ---------- Palette (game colours from houses.js and map.js, andliu tokens elsewhere) ---------- */
const C = {
  ink: '#12142b', paper: '#f4efe6', card: '#fbf8f1', apricot: '#e98a5a', peach: '#ffcf98', gold: '#ffd98a', brass: '#d4a73a',
  glow: '#ffe7b0', amberGlow: '#ffb35c',
  road: '#5a4850', shoulder: '#c9a47a', edge: '#d9c09c', dash: '#e9a94a', // scene r4: warmer, lower contrast, so the roads stop being the brightest shape
  plaza: '#f5cf98', brick: '#f0c48e',
  plank: '#d9a066', plank2: '#c98f58', rail: '#e98a5a', pile: '#6b4a33', trunk: '#7a5236',
} as const;

const GROUND = 0.06; // the grass top, in island units (the game's land is flat, a low bank over the water)

/* ---------- Shared geometry and materials (made once, reused by every mesh) ---------- */
const mats = new Map<string, THREE.Material>();
function mat(color: string, opts: { glow?: number; opacity?: number; smooth?: boolean; double?: boolean } = {}) {
  const key = `${color}|${opts.glow ?? 0}|${opts.opacity ?? 1}|${opts.smooth ? 1 : 0}|${opts.double ? 1 : 0}`;
  let m = mats.get(key);
  if (!m) {
    m = isle(new THREE.MeshStandardMaterial({
      color, roughness: 0.9, metalness: 0, flatShading: !opts.smooth,
      emissive: opts.glow ? color : '#000000', emissiveIntensity: opts.glow ?? 0,
      transparent: opts.opacity !== undefined && opts.opacity < 1, opacity: opts.opacity ?? 1,
      depthWrite: !(opts.opacity !== undefined && opts.opacity < 1),
      side: opts.double ? THREE.DoubleSide : THREE.FrontSide,
    }), 'built');
    mats.set(key, m);
  }
  return m;
}

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  disc: new THREE.CylinderGeometry(1, 1, 1, 48),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  cone7: new THREE.ConeGeometry(1, 1, 7),
  ico: new THREE.IcosahedronGeometry(1, 0),
  ball: new THREE.IcosahedronGeometry(1, 1),
  smooth: new THREE.SphereGeometry(1, 20, 14),
  dodec: new THREE.DodecahedronGeometry(1, 0),
  blob: (() => { // the 20-face ball again, but with rounded normals: a bush shades as one soft mass
    const g = new THREE.IcosahedronGeometry(1, 0);
    g.setAttribute('normal', g.getAttribute('position').clone());
    return g;
  })(),
  dome: new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  torus: new THREE.TorusGeometry(1, 0.16, 8, 24),
  arch: new THREE.TorusGeometry(1, 0.05, 4, 16, Math.PI).rotateY(Math.PI / 2), // a half ring across x, standing up
  vault: new THREE.CylinderGeometry(1, 1, 1, 16, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), // a half barrel along x
  gable: (() => { // a triangular prism 1 wide, 1 tall, 1 deep, its base on y=0, ridge along z
    const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
    return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
  })(),
  wedge: (() => { // a sawtooth: 1 deep (z), 1 tall, 1 wide (x), its tall face at the front (+z)
    const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0.5, 1)]);
    return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5).rotateY(-Math.PI / 2);
  })(),
};

// A seeded random, so the trees and rocks land in the same places every visit.
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

type V3 = [number, number, number];
const deg = (d: number) => (d * Math.PI) / 180;

// Round shapes shade round (their own smooth normals) unless a part says otherwise, so the moon
// slides round a tower, a column or a dome instead of stepping across its facets.
const ROUND = new Set<THREE.BufferGeometry>([G.cyl, G.disc, G.ball, G.smooth, G.dome, G.torus, G.vault]);
function Part({ geo, color, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], glow, opacity, smooth, double }: {
  geo: THREE.BufferGeometry; color: string; p?: V3; s?: V3 | number; r?: V3; glow?: number; opacity?: number; smooth?: boolean; double?: boolean;
}) {
  return <mesh geometry={geo} material={mat(color, { glow, opacity, smooth: smooth ?? ROUND.has(geo), double })} position={p} scale={s} rotation={r} />;
}

// Spins its children about one axis (the reel, the tooth's ring); still under reduced motion.
function Spin({ still, speed, axis = 'y', p, children }: { still: boolean; speed: number; axis?: 'y' | 'z'; p?: V3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (!still && ref.current) ref.current.rotation[axis] += dt * speed; });
  return <group ref={ref} position={p}>{children}</group>;
}

// Lit windows on a front wall (local +z), w wide, at height y.
function Windows({ w, y, z, n = 2, color = C.glow, x = 0, sw = 0.09, sh = 0.13 }: { w: number; y: number; z: number; n?: number; color?: string; x?: number; sw?: number; sh?: number }) {
  return <>{Array.from({ length: n }, (_, i) => (
    <Part key={i} geo={G.box} color={color} glow={1.2} p={[x + (i - (n - 1) / 2) * (w / n), y, z]} s={[sw, sh, 0.02]} />
  ))}</>;
}

/* ---------- The eight résumé landmarks (houses.js), enlarged. Front door at local +z. ---------- */

// Blueberry Lab: a berry-blue block with a cream band, orange portholes and a giant blueberry dome.
function Lab() {
  return <group>
    <Part geo={G.box} color="#3b4f9e" p={[0, 0.06, 0]} s={[1.08, 0.12, 0.74]} />
    <Part geo={G.box} color="#4a5fc4" p={[0, 0.3, 0]} s={[1.04, 0.42, 0.7]} />
    <Part geo={G.box} color="#fff3e4" p={[0, 0.54, 0]} s={[1.1, 0.07, 0.76]} />
    {[0.16, 0.34, -0.36].map(x => <Part key={x} geo={G.cyl} color={C.amberGlow} glow={1.3} p={[x, 0.32, 0.355]} r={[Math.PI / 2, 0, 0]} s={[0.065, 0.02, 0.065]} />)}
    <Part geo={G.box} color="#fff3e4" p={[-0.1, 0.16, 0.355]} s={[0.15, 0.26, 0.02]} />
    <Part geo={G.box} color="#7489dc" p={[-0.1, 0.31, 0.4]} s={[0.26, 0.025, 0.1]} />
    {/* the blueberry on the roof, its star crown and leaf */}
    <Part geo={G.dome} color="#3346a6" smooth p={[0.04, 0.575, -0.03]} s={[0.4, 0.36, 0.38]} />
    <Part geo={G.cone7} color="#23306b" p={[0.04, 0.95, -0.03]} s={[0.1, 0.06, 0.1]} r={[Math.PI, 0, 0]} />
    <Part geo={G.cone4} color="#6fae4a" p={[0.13, 0.97, -0.03]} s={[0.08, 0.03, 0.04]} r={[0, 0, -0.7]} />
    <Part geo={G.cyl} color={C.paper} p={[-0.43, 0.66, -0.22]} s={[0.05, 0.18, 0.05]} />
    <Part geo={G.ball} color="#b48cff" glow={1.4} p={[0.44, 0.63, 0.22]} s={0.06} />
    {[-0.34, 0.06, 0.26].map((x, i) => <Part key={x} geo={G.smooth} color="#3b4f9e" smooth p={[x, 0.045, 0.5 + (i % 2) * 0.05]} s={0.045} />)}
  </group>;
}
// Second Brain Greenhouse: a brick base, glass walls under a vaulted glass roof on white ribs, a
// pink ridge, pink grow lights and a pink brain topiary out front.
function Greenhouse() {
  return <group>
    <Part geo={G.box} color="#d98a6a" p={[0, 0.06, 0]} s={[1.0, 0.12, 0.68]} />
    <Part geo={G.ico} color="#6fae4a" p={[-0.22, 0.19, -0.05]} s={0.12} />
    <Part geo={G.ico} color="#f29bbd" p={[0.18, 0.18, 0.06]} s={0.1} />
    <Part geo={G.ico} color="#4f8f3a" p={[0.02, 0.2, -0.14]} s={0.12} />
    <Part geo={G.box} color="#ff9fd0" glow={1.2} p={[0, 0.39, 0]} s={[0.7, 0.02, 0.04]} />
    <Part geo={G.box} color="#dff1ff" opacity={0.32} p={[0, 0.27, 0]} s={[0.96, 0.3, 0.64]} />
    <Part geo={G.vault} color="#dff1ff" opacity={0.32} double p={[0, 0.42, 0]} s={[0.96, 0.24, 0.32]} />
    {[-0.47, -0.16, 0.16, 0.47].map(x => <Part key={x} geo={G.arch} color="#ffffff" p={[x, 0.42, 0]} s={[1, 0.24, 0.32]} />)}
    {[-0.47, 0.47].map(x => [-0.32, 0.32].map(z => <Part key={`${x}${z}`} geo={G.box} color="#ffffff" p={[x, 0.27, z]} s={[0.025, 0.3, 0.025]} />))}
    <Part geo={G.box} color="#d6689a" p={[0, 0.665, 0]} s={[1.0, 0.03, 0.03]} />
    {[-0.5, 0.5].map(x => <Part key={x} geo={G.ball} color="#d6689a" p={[x, 0.68, 0]} s={0.03} />)}
    <Part geo={G.box} color="#d6689a" p={[0, 0.2, 0.325]} s={[0.15, 0.24, 0.02]} />
    <Part geo={G.cyl6} color={C.trunk} p={[0.38, 0.06, 0.5]} s={[0.015, 0.12, 0.015]} />
    <Part geo={G.ball} color="#e889b4" p={[0.38, 0.16, 0.5]} s={[0.1, 0.08, 0.08]} />
  </group>;
}
// Animation Studio: a purple sound stage with ribs, a coral sawtooth roof with glowing north
// lights, a bulb-lit marquee with a gold star, a clapperboard and a turning film reel on the roof.
function Studio({ still }: { still: boolean }) {
  return <group>
    <Part geo={G.box} color="#5b4a7a" p={[0, 0.29, 0]} s={[1.0, 0.58, 0.72]} />
    {[-0.48, -0.24, 0.24, 0.48].map(x => <Part key={x} geo={G.box} color="#47395f" p={[x, 0.29, 0.365]} s={[0.035, 0.58, 0.02]} />)}
    {[-0.24, 0, 0.24].map(z => <group key={z}>
      <Part geo={G.wedge} color="#e2725b" p={[0, 0.58, z]} s={[1.02, 0.2, 0.24]} />
      <Part geo={G.box} color={C.amberGlow} glow={1.4} p={[0, 0.675, z + 0.122]} s={[0.94, 0.15, 0.01]} />
    </group>)}
    <Part geo={G.box} color="#2a2340" p={[0, 0.4, 0.39]} s={[0.56, 0.13, 0.05]} />
    {Array.from({ length: 7 }, (_, i) => <Part key={i} geo={G.ball} color={C.gold} glow={1.6} p={[-0.24 + i * 0.08, 0.475, 0.41]} s={0.016} />)}
    <Part geo={G.ico} color={C.gold} glow={0.9} p={[0, 0.4, 0.42]} s={0.045} />
    <Part geo={G.box} color={C.paper} p={[0.33, 0.12, 0.365]} s={[0.14, 0.22, 0.02]} />
    <Part geo={G.box} color="#1b1726" p={[-0.26, 0.86, -0.05]} s={[0.24, 0.17, 0.04]} />
    <Part geo={G.box} color={C.paper} p={[-0.26, 0.97, -0.05]} s={[0.25, 0.04, 0.045]} r={[0, 0, -0.18]} />
    <Part geo={G.box} color={C.ink} p={[0.22, 0.72, -0.05]} s={[0.03, 0.2, 0.03]} />
    <Spin still={still} speed={0.9} axis="z" p={[0.22, 0.9, -0.05]}>
      <Part geo={G.cyl} color="#1b1726" r={[Math.PI / 2, 0, 0]} s={[0.17, 0.035, 0.17]} />
      {[0, 1, 2, 3, 4].map(i => <Part key={i} geo={G.cyl6} color={C.paper} p={[Math.cos(i * 1.2566) * 0.1, Math.sin(i * 1.2566) * 0.1, 0.02]} r={[Math.PI / 2, 0, 0]} s={[0.035, 0.01, 0.035]} />)}
    </Spin>
  </group>;
}
// Browser Use Dock: a wooden deck on pilings over the sea, a teal clapboard harbour office with a
// steep dark-teal gable, a round window and a life ring, a striped lighthouse with a glowing lamp
// at its back corner, and a pier out to a moored white boat. The sea is behind it (local -z).
function Dock() {
  return <group>
    <Part geo={G.box} color="#c89b6d" p={[0, -0.02, -0.12]} s={[1.3, 0.04, 0.92]} />
    {[-0.58, 0, 0.58].map(x => [-0.52, 0.28].map(z => <Part key={`${x}${z}`} geo={G.cyl6} color={C.pile} p={[x, -0.2, z]} s={[0.03, 0.36, 0.03]} />))}
    <Part geo={G.box} color="#2f9e8f" p={[-0.12, 0.2, -0.06]} s={[0.62, 0.4, 0.46]} />
    {[0.08, 0.14, 0.26, 0.32].map(y => <Part key={y} geo={G.box} color="#278a7d" p={[-0.12, y, 0.176]} s={[0.63, 0.012, 0.01]} />)}
    <Part geo={G.gable} color="#1f6f64" p={[-0.12, 0.4, -0.06]} s={[0.72, 0.34, 0.54]} />
    <Part geo={G.cyl} color={C.glow} glow={1.2} p={[-0.12, 0.5, 0.215]} r={[Math.PI / 2, 0, 0]} s={[0.05, 0.01, 0.05]} />
    <Windows w={0.42} x={-0.12} y={0.22} z={0.177} n={2} />
    <Part geo={G.box} color="#1f6f64" p={[-0.12, 0.1, 0.177]} s={[0.1, 0.18, 0.02]} />
    <Part geo={G.torus} color="#d9534f" p={[0.12, 0.26, 0.18]} s={0.045} />
    {/* the lighthouse, red and white, at the back corner */}
    {[0, 1, 2, 3].map(i => <Part key={i} geo={G.cyl} color={i % 2 ? '#ffffff' : '#d9534f'} p={[0.44, 0.07 + i * 0.13, -0.42]} s={[0.085 - i * 0.008, 0.13, 0.085 - i * 0.008]} />)}
    <Part geo={G.cyl} color="#ffffff" p={[0.44, 0.6, -0.42]} s={[0.06, 0.08, 0.06]} opacity={0.6} />
    <Part geo={G.ball} color="#fff1b0" glow={2.2} p={[0.44, 0.6, -0.42]} s={0.04} />
    <Part geo={G.cone7} color="#d9534f" p={[0.44, 0.69, -0.42]} s={[0.075, 0.09, 0.075]} />
    {/* the pier and the boat */}
    <Part geo={G.box} color="#c89b6d" p={[-0.38, -0.03, -0.95]} s={[0.17, 0.03, 0.75]} />
    <Part geo={G.box} color="#ffffff" p={[-0.12, -0.03, -1.12]} s={[0.13, 0.06, 0.32]} />
    <Part geo={G.box} color="#d9534f" p={[-0.12, 0.005, -1.12]} s={[0.14, 0.015, 0.33]} />
    <Part geo={G.ball} color="#d9534f" glow={0.4} p={[0.25, -0.01, -1.2]} s={0.03} />
  </group>;
}
// Education One Schoolhouse: a red schoolhouse with white corner boards and a dark red roof, a
// clock in the front gable, tall lit windows, an open white bell tower with a brass bell, a chimney.
function School() {
  return <group>
    <Part geo={G.box} color="#d9534f" p={[0, 0.27, 0]} s={[1.0, 0.54, 0.66]} />
    {[-0.5, 0.5].map(x => [-0.33, 0.33].map(z => <Part key={`${x}${z}`} geo={G.box} color="#ffffff" p={[x, 0.27, z]} s={[0.04, 0.54, 0.04]} />))}
    <Part geo={G.gable} color="#d9534f" p={[0, 0.54, 0]} s={[0.98, 0.32, 0.64]} />
    {[-1, 1].map(k => <Part key={k} geo={G.box} color="#7a2e2b" p={[k * 0.25, 0.7, 0]} s={[0.62, 0.035, 0.78]} r={[0, 0, -k * 0.57]} />)}
    <Part geo={G.cyl} color="#ffffff" p={[0, 0.66, 0.335]} r={[Math.PI / 2, 0, 0]} s={[0.075, 0.01, 0.075]} />
    <Part geo={G.box} color={C.ink} p={[0, 0.68, 0.342]} s={[0.008, 0.05, 0.004]} />
    <Part geo={G.box} color={C.ink} p={[0.015, 0.66, 0.342]} s={[0.035, 0.008, 0.004]} />
    <Windows w={0.8} y={0.3} z={0.335} n={4} sh={0.2} sw={0.085} />
    <Part geo={G.box} color="#8f3532" p={[0, 0.13, 0.336]} s={[0.12, 0.24, 0.02]} />
    <group position={[0, 0.88, 0.16]}>
      <Part geo={G.box} color="#ffffff" p={[0, 0, 0]} s={[0.18, 0.03, 0.18]} />
      {[-0.07, 0.07].map(x => [-0.07, 0.07].map(z => <Part key={`${x}${z}`} geo={G.box} color="#ffffff" p={[x, 0.09, z]} s={[0.022, 0.17, 0.022]} />))}
      <Part geo={G.ball} color={C.brass} glow={0.3} p={[0, 0.08, 0]} s={0.04} />
      <Part geo={G.cone4} color="#7a2e2b" p={[0, 0.25, 0]} s={[0.14, 0.15, 0.14]} r={[0, Math.PI / 4, 0]} />
      <Part geo={G.box} color={C.ink} p={[0, 0.36, 0]} s={[0.008, 0.08, 0.008]} />
      <Part geo={G.box} color={C.ink} p={[0, 0.38, 0]} s={[0.07, 0.008, 0.008]} />
    </group>
    <Part geo={G.box} color="#a3473a" p={[0.3, 0.8, -0.16]} s={[0.07, 0.2, 0.07]} />
  </group>;
}
// UMD Quad: a brick collegiate hall with white quoins, two storeys of lit windows, a white portico
// under a red and gold pediment, a slate roof and a white cupola with a gold ball; in front, a red
// brick gateway arch, the bronze terrapin on its plinth and the red and gold sign.
function Umd() {
  return <group>
    <Part geo={G.box} color="#b3402f" p={[0, 0.3, -0.06]} s={[1.05, 0.6, 0.58]} />
    {[-0.525, 0.525].map(x => [0.1, 0.25, 0.4, 0.55].map(y => <Part key={`${x}${y}`} geo={G.box} color="#f4efe6" p={[x, y, 0.23]} s={[0.04, 0.06, 0.04]} />))}
    <Windows w={0.96} y={0.2} z={0.235} n={6} sw={0.07} />
    <Windows w={0.96} y={0.44} z={0.235} n={6} sw={0.07} />
    <Part geo={G.gable} color="#5d5470" p={[0, 0.6, -0.06]} s={[0.64, 0.24, 1.1]} r={[0, Math.PI / 2, 0]} />
    {[-0.21, -0.07, 0.07, 0.21].map(x => <Part key={x} geo={G.cyl} color="#ffffff" p={[x, 0.2, 0.31]} s={[0.03, 0.4, 0.03]} />)}
    <Part geo={G.box} color={C.gold} p={[0, 0.41, 0.31]} s={[0.56, 0.03, 0.1]} />
    <Part geo={G.gable} color="#c8102e" p={[0, 0.425, 0.31]} s={[0.56, 0.14, 0.08]} />
    <Part geo={G.box} color="#c8102e" p={[0, 0.11, 0.236]} s={[0.11, 0.2, 0.02]} />
    <Part geo={G.box} color="#ffffff" p={[0, 0.92, -0.06]} s={[0.16, 0.16, 0.16]} />
    <Part geo={G.dome} color="#5d5470" p={[0, 1.0, -0.06]} s={0.1} />
    <Part geo={G.ball} color={C.gold} glow={0.4} p={[0, 1.13, -0.06]} s={0.035} />
    {/* the gateway arch */}
    {[-0.42, 0.42].map(x => <Part key={x} geo={G.box} color="#a8392b" p={[x, 0.37, 0.44]} s={[0.11, 0.74, 0.11]} />)}
    <Part geo={G.box} color="#a8392b" p={[0, 0.78, 0.44]} s={[0.98, 0.11, 0.13]} />
    <Part geo={G.box} color="#e8d9b0" p={[0, 0.845, 0.44]} s={[1.02, 0.025, 0.15]} />
    <Part geo={G.box} color="#9a948a" p={[-0.6, 0.04, 0.4]} s={[0.14, 0.08, 0.14]} />
    <Part geo={G.dome} color="#7a6a3a" p={[-0.6, 0.08, 0.4]} s={[0.07, 0.05, 0.09]} />
    <Part geo={G.box} color="#c8102e" p={[0.62, 0.13, 0.42]} s={[0.2, 0.11, 0.02]} />
    <Part geo={G.box} color={C.gold} p={[0.62, 0.1, 0.432]} s={[0.17, 0.025, 0.005]} />
  </group>;
}
// The Clinic: a rounded white block with a blue band and roof, a glass curtain wall, a taller blue
// stair tower with a white plus, a canopy, and a big smiling tooth on the roof inside a blue ring
// that slowly turns.
function Clinic({ still }: { still: boolean }) {
  return <group>
    <Part geo={G.box} color="#f7fbfd" p={[0.06, 0.25, 0]} s={[0.94, 0.5, 0.7]} />
    <Part geo={G.box} color="#4fa3c7" p={[0.06, 0.43, 0.004]} s={[0.96, 0.06, 0.71]} />
    <Part geo={G.box} color="#3d8db3" p={[0.06, 0.53, 0]} s={[1.0, 0.06, 0.76]} />
    <Part geo={G.box} color="#dff4ff" glow={0.8} p={[0.14, 0.24, 0.355]} s={[0.5, 0.22, 0.01]} />
    {[-0.04, 0.08, 0.2, 0.32].map(x => <Part key={x} geo={G.box} color="#9fb7c4" p={[x, 0.24, 0.362]} s={[0.012, 0.22, 0.008]} />)}
    <Part geo={G.box} color="#4fa3c7" p={[-0.4, 0.36, 0.06]} s={[0.24, 0.72, 0.36]} />
    <Part geo={G.box} color="#ffffff" p={[-0.4, 0.55, 0.245]} s={[0.12, 0.035, 0.01]} />
    <Part geo={G.box} color="#ffffff" p={[-0.4, 0.55, 0.245]} s={[0.035, 0.12, 0.01]} />
    <Part geo={G.box} color="#ffffff" p={[0.14, 0.17, 0.45]} s={[0.4, 0.025, 0.2]} />
    <Part geo={G.box} color="#4fa3c7" p={[0.14, 0.08, 0.356]} s={[0.12, 0.16, 0.02]} />
    <group position={[0.14, 0.82, -0.04]}>
      <Part geo={G.smooth} color="#ffffff" smooth p={[0, 0.03, 0]} s={[0.13, 0.11, 0.1]} />
      <Part geo={G.cone7} color="#ffffff" p={[-0.06, -0.1, 0]} s={[0.05, 0.14, 0.05]} r={[Math.PI, 0, 0.18]} />
      <Part geo={G.cone7} color="#ffffff" p={[0.06, -0.1, 0]} s={[0.05, 0.14, 0.05]} r={[Math.PI, 0, -0.18]} />
      <Part geo={G.box} color={C.ink} p={[0, 0.0, 0.1]} s={[0.05, 0.012, 0.005]} />
      {[-0.035, 0.035].map(x => <Part key={x} geo={G.box} color={C.ink} p={[x, 0.05, 0.098]} s={[0.014, 0.022, 0.005]} />)}
      <Spin still={still} speed={0.5}>
        <Part geo={G.torus} color="#4fa3c7" glow={0.25} s={[0.21, 0.21, 0.21]} />
      </Spin>
    </group>
  </group>;
}
// Focus Family Chapel: cream walls on a stone base with buttresses, gold lancet windows, a rose
// window over an arched door, a terracotta roof and a steeple with a belfry, a spire and a gold cross.
function Chapel() {
  return <group>
    <Part geo={G.box} color="#d8cbb3" p={[0, 0.05, 0]} s={[0.7, 0.1, 0.98]} />
    <Part geo={G.box} color="#fbf6ea" p={[0, 0.32, 0]} s={[0.64, 0.46, 0.94]} />
    <Part geo={G.gable} color="#fbf6ea" p={[0, 0.55, 0]} s={[0.64, 0.3, 0.94]} />
    {[-1, 1].map(k => <Part key={k} geo={G.box} color="#b5653f" p={[k * 0.165, 0.7, 0]} s={[0.47, 0.035, 1.02]} r={[0, 0, -k * 0.74]} />)}
    {[-0.33, 0.33].map(x => [-0.3, 0, 0.3].map(z => <group key={`${x}${z}`}>
      <Part geo={G.box} color="#d8cbb3" p={[x * 1.06, 0.15, z + 0.15]} s={[0.05, 0.3, 0.06]} />
      <Part geo={G.box} color={C.gold} glow={1.1} p={[x * 1.005, 0.34, z]} s={[0.01, 0.17, 0.06]} />
    </group>))}
    <Part geo={G.cyl} color={C.gold} glow={1.2} p={[0, 0.62, 0.475]} r={[Math.PI / 2, 0, 0]} s={[0.07, 0.01, 0.07]} />
    <Part geo={G.box} color="#e07a3a" p={[0, 0.15, 0.475]} s={[0.13, 0.25, 0.02]} />
    {[-0.12, 0.12].map(x => <Part key={x} geo={G.ball} color={C.amberGlow} glow={1.6} p={[x, 0.24, 0.5]} s={0.022} />)}
    <Part geo={G.box} color="#fbf6ea" p={[0, 0.93, 0.3]} s={[0.2, 0.32, 0.2]} />
    <Part geo={G.box} color="#3a2f2a" p={[0, 0.98, 0.3]} s={[0.21, 0.09, 0.12]} />
    <Part geo={G.box} color="#3a2f2a" p={[0, 0.98, 0.3]} s={[0.12, 0.09, 0.21]} />
    <Part geo={G.cone4} color="#b5653f" p={[0, 1.26, 0.3]} s={[0.16, 0.34, 0.16]} r={[0, Math.PI / 4, 0]} />
    <Part geo={G.box} color="#c9a24a" glow={0.5} p={[0, 1.5, 0.3]} s={[0.018, 0.14, 0.018]} />
    <Part geo={G.box} color="#c9a24a" glow={0.5} p={[0, 1.52, 0.3]} s={[0.08, 0.018, 0.018]} />
  </group>;
}

// The landmarks in LANDMARKS order (landmarks.ts): zone i of town-layout's ZONES, with each one's
// height (for its hotspot and label) and the colour of the glowing rim round its pad.
type Landmark = { h: number; rim: string; el: (still: boolean) => ReactNode };
// The buildings above are modelled about 1 unit (29 m) wide. At 0.36 they came out at the game's
// own 10 to 12 m and, seen from the page's far, low camera, read as flat props (Andrew 2026-11-11:
// "make the buildings and trees taller too"). So they are drawn a little bigger than the game's
// (13 m wide) and stretched upward by LANDMARK_TALL: a chapel of 16 m is now 24 m. From this
// distance that reads the way the game's buildings do from its close camera.
const LANDMARK_SCALE = 0.46;
const LANDMARK_TALL = 1.2;
const LANDMARK_XYZ: V3 = [LANDMARK_SCALE, LANDMARK_SCALE * LANDMARK_TALL, LANDMARK_SCALE];
// The inner town (modelled in metres): wider by a quarter and taller by a half, for the same reason.
const TOWN_XYZ: V3 = [S * 1.25, S * 1.5, S * 1.25];
const LANDMARK_SET: Landmark[] = [
  { h: 0.98, rim: '#3b4f9e', el: () => <Lab /> },
  { h: 0.72, rim: '#d6689a', el: () => <Greenhouse /> },
  { h: 1.06, rim: '#8a5cc2', el: s => <Studio still={s} /> },
  { h: 0.78, rim: '#2f9e8f', el: () => <Dock /> },
  { h: 1.28, rim: '#d9534f', el: () => <School /> },
  { h: 1.16, rim: '#c8102e', el: () => <Umd /> },
  { h: 1.06, rim: '#4fa3c7', el: s => <Clinic still={s} /> },
  { h: 1.54, rim: '#c9a24a', el: () => <Chapel /> },
];

// The town round the plaza, from the game (unlabelled; the labels are for the eight landmarks):
// Skills Alley's bowling diner, the Off the Clock cottage, the Now Building timber frame with its
// crane, the Mailbox post office, the garage on the plaza and two plain houses. Modelled in metres
// (each is drawn inside a group scaled by S) a little over the game's size, so they read from the
// page's far camera. Each zone stands on a brick pad with a glowing rim in its own colour.
const INNER_RIM: Record<string, string> = { skills: '#e98a5a', yard: '#6fae4a', now: '#f2b705', contact: '#d9534f' };
// Two small houses with no zone, west and north-west of the plaza (as in the game's overview).
const EXTRA_HOUSES = [{ x: -40, z: 2, roof: '#d9534f' }, { x: 44, z: 22, roof: '#5b6fd6' }];

function Lit({ p, s }: { p: V3; s: V3 }) {
  return <Part geo={G.box} color={C.glow} glow={1.3} p={p} s={s} />;
}
function InnerZone({ id }: { id: string }) {
  // Skills Alley: an orange diner with a cream roof slab, a row of lit windows and a giant pin.
  if (id === 'skills') return <group>
    <Part geo={G.box} color="#e98a5a" p={[0, 1.9, 0]} s={[9, 3.8, 6]} />
    <Part geo={G.box} color={C.paper} p={[0, 3.95, 0]} s={[9.8, 0.5, 6.8]} />
    <Part geo={G.box} color="#c9603e" p={[0, 0.35, 0]} s={[9.2, 0.7, 6.2]} />
    {[-3, -1, 1, 3].map(x => <Lit key={x} p={[x, 2.1, 3.02]} s={[1.3, 1.3, 0.1]} />)}
    <Part geo={G.box} color="#8f3532" p={[0, 1.1, 3.02]} s={[1.2, 2.2, 0.1]} />
    <Part geo={G.smooth} color="#ffffff" smooth p={[2.6, 5.6, -0.8]} s={[0.9, 1.6, 0.9]} />
    <Part geo={G.smooth} color="#ffffff" smooth p={[2.6, 7.4, -0.8]} s={[0.55, 0.6, 0.55]} />
    <Part geo={G.cyl} color="#e5484d" p={[2.6, 6.75, -0.8]} s={[0.5, 0.25, 0.5]} />
  </group>;
  // Off the Clock: a cream cottage under a golden thatch, with lit windows and two garden beds.
  if (id === 'yard') return <group>
    <Part geo={G.box} color="#fbf0d6" p={[0, 1.6, 0]} s={[7.5, 3.2, 5.5]} />
    <Part geo={G.gable} color="#d9b45a" p={[0, 3.2, 0]} s={[6.6, 3.0, 8.3]} r={[0, Math.PI / 2, 0]} />
    <Part geo={G.box} color="#8a5a3a" p={[2.2, 5.0, -0.6]} s={[0.8, 2.0, 0.8]} />
    {[-2.2, 2.2].map(x => <Lit key={x} p={[x, 1.8, 2.78]} s={[1.1, 1.1, 0.1]} />)}
    <Part geo={G.box} color="#6b4a33" p={[0, 1.0, 2.78]} s={[1.1, 2.0, 0.1]} />
    {[-2.5, 2.5].map(x => <Part key={x} geo={G.box} color="#6b4a33" p={[x, 0.2, 5.4]} s={[2.2, 0.4, 1.4]} />)}
  </group>;
  // Now Building: a half-built timber frame on a deck, with a yellow tower crane over it.
  if (id === 'now') return <group>
    <Part geo={G.box} color="#c89b6d" p={[0, 0.2, 0]} s={[9, 0.4, 6.5]} />
    {[-4, 0, 4].map(x => [-2.9, 2.9].map(z => <Part key={`${x}${z}`} geo={G.box} color="#e0a868" p={[x, 2.2, z]} s={[0.4, 4.0, 0.4]} />))}
    <Part geo={G.box} color="#e0a868" p={[0, 4.2, -2.9]} s={[8.6, 0.35, 0.35]} />
    <Part geo={G.box} color="#e0a868" p={[0, 4.2, 2.9]} s={[8.6, 0.35, 0.35]} />
    <Part geo={G.box} color="#d9a066" p={[-2, 1.5, 0]} s={[4.6, 2.6, 4.6]} />
    <Part geo={G.gable} color="#a8693a" p={[-2, 2.8, 0]} s={[5.0, 1.8, 5.0]} />
    <Lit p={[-2, 1.5, 2.32]} s={[1.0, 1.0, 0.1]} />
    <Part geo={G.box} color="#f2b705" p={[5.4, 5.5, -2.5]} s={[0.5, 11, 0.5]} />
    <Part geo={G.box} color="#f2b705" p={[2.6, 10.9, -2.5]} s={[8.5, 0.45, 0.45]} />
    <Part geo={G.box} color="#3a3540" p={[7.4, 10.4, -2.5]} s={[1.4, 1.1, 0.9]} />
    <Part geo={G.box} color="#3a3540" p={[-0.6, 8.6, -2.5]} s={[0.06, 4.2, 0.06]} />
  </group>;
  // Mailbox: a red post office with white trim, a beige roof, a blue and white striped awning and
  // a blue mailbox by the door.
  return <group>
    <Part geo={G.box} color="#d9534f" p={[0, 2.0, 0]} s={[8, 4.0, 5.5]} />
    {[-4, 4].map(x => <Part key={x} geo={G.box} color="#ffffff" p={[x, 2.0, 2.75]} s={[0.4, 4.0, 0.4]} />)}
    <Part geo={G.box} color="#ffffff" p={[0, 3.6, 2.78]} s={[8.2, 0.5, 0.1]} />
    <Part geo={G.box} color="#e8d2b0" p={[0, 4.25, 0]} s={[8.8, 0.5, 6.2]} />
    {[-3, -1.5, 0, 1.5, 3].map((x, i) => <Part key={x} geo={G.box} color={i % 2 ? '#ffffff' : '#3b6fd6'} p={[x, 2.9, 3.4]} s={[1.5, 0.12, 1.4]} r={[0.35, 0, 0]} />)}
    {[-2.4, 2.4].map(x => <Lit key={x} p={[x, 1.8, 2.78]} s={[1.6, 1.3, 0.1]} />)}
    <Part geo={G.box} color={C.paper} p={[0, 1.1, 2.78]} s={[1.2, 2.2, 0.1]} />
    <Part geo={G.box} color="#3b4f9e" p={[3.2, 0.7, 4.6]} s={[0.9, 1.4, 0.7]} />
  </group>;
}
// A plain house: cream walls, a coloured gable roof, lit windows.
function House({ roof }: { roof: string }) {
  return <group>
    <Part geo={G.box} color="#f4e6d0" p={[0, 1.5, 0]} s={[6, 3, 4.6]} />
    <Part geo={G.gable} color={roof} p={[0, 3, 0]} s={[6.6, 2.4, 5.2]} />
    {[-1.6, 1.6].map(x => <Lit key={x} p={[x, 1.6, 2.32]} s={[1, 1, 0.1]} />)}
    <Part geo={G.box} color="#6b4a33" p={[0, 0.9, 2.32]} s={[0.9, 1.8, 0.1]} />
  </group>;
}
// The garage on the plaza's north edge: an open timber canopy on posts over two parked cars, with
// a teal sign band along its front and a warm light under the roof.
function Garage() {
  return <group>
    <Part geo={G.box} color="#e7c79a" p={[0, 0.06, 0]} s={[13, 0.12, 6.5]} />
    {[-6, -2, 2, 6].map(x => [-3, 3].map(z => <Part key={`${x}${z}`} geo={G.box} color="#7a4a2e" p={[x, 1.9, z]} s={[0.35, 3.8, 0.35]} />))}
    <Part geo={G.box} color="#8a5a3a" p={[0, 3.95, 0]} s={[13.4, 0.3, 7]} />
    {[-4.5, -1.5, 1.5, 4.5].map(x => <Part key={x} geo={G.box} color="#6b3f26" p={[x, 4.25, 0]} s={[0.3, 0.35, 7.2]} />)}
    <Part geo={G.box} color="#1f8a7a" p={[0, 3.3, 3.3]} s={[9, 0.9, 0.2]} />
    <Part geo={G.box} color="#fff4e2" glow={0.5} p={[0, 3.3, 3.42]} s={[4.2, 0.35, 0.05]} />
    <Part geo={G.box} color={C.amberGlow} glow={1.2} p={[0, 3.75, 0]} s={[11, 0.06, 0.4]} />
    <Part geo={G.box} color="#d9534f" p={[-3, 0.75, 0]} s={[2.2, 1.0, 4]} />
    <Part geo={G.box} color={C.card} p={[-3, 1.5, -0.3]} s={[1.9, 0.7, 2]} />
    <Part geo={G.box} color="#5b6fd6" p={[3, 0.75, 0]} s={[2.2, 1.0, 4]} />
    <Part geo={G.box} color={C.card} p={[3, 1.5, -0.3]} s={[1.9, 0.7, 2]} />
  </group>;
}
// The ANDREW / LIU alphabet blocks, in the game's six colours.
const BLOCK_COLS = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#b5179e', '#f77f00'];
function Blocks() {
  const b = 2.0, gap = 2.3;
  return <group>
    {Array.from({ length: 6 }, (_, i) => <Part key={`a${i}`} geo={G.box} color={BLOCK_COLS[i]} p={[(i - 2.5) * gap, b / 2, 0]} r={[0, (i % 3 - 1) * 0.12, 0]} s={b} />)}
    {Array.from({ length: 3 }, (_, i) => <Part key={`l${i}`} geo={G.box} color={BLOCK_COLS[(i + 3) % 6]} p={[(i - 1) * gap, b / 2, -2.6]} r={[0, ((i + 1) % 3 - 1) * 0.15, 0]} s={b} />)}
  </group>;
}

/* ---------- The land: one terrain mesh, from the game's map ---------- */

let layoutCache: TownLayout | null = null;
const getLayout = () => (layoutCache ??= townLayout());

// Ground height in island units from the signed distance to the shore in metres (negative on
// land): the flat land, a beach sloping gently down over 9 m to the waterline (no cliff), then a
// sand shelf that keeps sinking slowly under the shallows, so the turquoise feathers out.
function heightAt(sd: number) {
  if (sd <= -9) return GROUND;
  if (sd <= 0) { const t = -sd / 9; return GROUND * t * t * (3 - 2 * t); }
  return -0.4 * (1 - Math.exp(-sd / 10));
}

function useTerrain(L: TownLayout) {
  return useMemo(() => {
    const STEP = 1.6, n = Math.round(L.SIZE / STEP) + 1;
    const pos = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3);
    const c = {
      // the game's night meadow (real-night-wide): its three greens dropped to a dark, cooled
      // blue-green, so the lamps, windows and roads carry the light and the land stays quiet
      g1: new THREE.Color('#41694a'), g2: new THREE.Color('#345a43'), g3: new THREE.Color('#4f7350'),
      dry: new THREE.Color('#6c6a55'), lush: new THREE.Color('#2a4f40'), sand: new THREE.Color('#d9bb8e'),
      wet: new THREE.Color('#b8956c'), shelf: new THREE.Color('#9a7c58'),
    };
    const tmp = new THREE.Color();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = L.MIN + i * STEP, z = L.MIN + j * STEP, sd = L.sdAt(x, z), k = (j * n + i) * 3;
      pos[k] = x * S; pos[k + 1] = heightAt(sd); pos[k + 2] = z * S;
      if (sd > 0) tmp.copy(c.wet).lerp(c.shelf, Math.min(1, sd / 5));
      else if (sd > -1.5) tmp.copy(c.wet).lerp(c.sand, -sd / 1.5);
      else if (sd > -4.5) tmp.copy(c.sand);
      else {
        // painterly grass: slow patches of three greens with a finer mottle, lush along the banks,
        // dry along the roads, and a soft feather into the sand
        const a = Math.sin(x * 0.043 + 1.7) * Math.sin(z * 0.051 - 0.4) + 0.5 * Math.sin((x - z) * 0.09 + 2.1);
        tmp.copy(c.g2).lerp(a > 0 ? c.g1 : c.g3, Math.min(1, Math.abs(a) * 0.9));
        const m = Math.sin(x * 0.31 + z * 0.17) * Math.sin(z * 0.27 - x * 0.12);
        tmp.lerp(m > 0 ? c.g3 : c.lush, Math.abs(m) * 0.18);
        tmp.lerp(c.lush, (1 - THREE.MathUtils.smoothstep(-sd, 4.5, 10)) * 0.7);
        const rd = L.roadDistAt(x, z);
        tmp.lerp(c.dry, (1 - THREE.MathUtils.smoothstep(rd, 5, 9)) * 0.5);
        if (sd > -6.5) tmp.lerp(c.sand, (sd + 6.5) / 2);
      }
      col[k] = tmp.r; col[k + 1] = tmp.g; col[k + 2] = tmp.b;
    }
    const idx: number[] = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + n;
      // skip quads that lie wholly under the sea floor's dark (the opaque ocean covers them)
      if (pos[a * 3 + 1] < -0.3 && pos[(a + 1) * 3 + 1] < -0.3 && pos[b * 3 + 1] < -0.3 && pos[(b + 1) * 3 + 1] < -0.3) continue;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const material = isle(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), 'ground');
    return { geo, material };
  }, [L]);
}

/* ---------- Roads and bridges ---------- */

const ROAD_HALF = 3.4, SHOULDER_HALF = 4.7; // metres: about the game's (3.3, 4.6); the close camera (scene r4) no longer needs fat roads to read them

function useRoads(L: TownLayout) {
  return useMemo(() => {
    const layers = { shoulder: [] as number[], asphalt: [] as number[], edge: [] as number[], dash: [] as number[] };
    // A marking stops wherever another road's asphalt covers it (as the game's do).
    const covered = (ri: number, x: number, z: number) => L.roads.some((r, rj) => rj !== ri && r.pts.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < (ROAD_HALF + 1.2) ** 2));
    const quad = (out: number[], a: { x: number; z: number; tx: number; tz: number }, b: typeof a, off: number, half: number, y: number) => {
      const ax0 = a.x + (-a.tz) * (off - half), az0 = a.z + a.tx * (off - half), ax1 = a.x + (-a.tz) * (off + half), az1 = a.z + a.tx * (off + half);
      const bx0 = b.x + (-b.tz) * (off - half), bz0 = b.z + b.tx * (off - half), bx1 = b.x + (-b.tz) * (off + half), bz1 = b.z + b.tx * (off + half);
      const ya = heightAt(L.sdAt(a.x, a.z)) + y, yb = heightAt(L.sdAt(b.x, b.z)) + y;
      out.push(ax0 * S, ya, az0 * S, ax1 * S, ya, az1 * S, bx0 * S, yb, bz0 * S, ax1 * S, ya, az1 * S, bx1 * S, yb, bz1 * S, bx0 * S, yb, bz0 * S);
    };
    L.roads.forEach((r, ri) => {
      const n = r.pts.length, segs = r.closed ? n : n - 1;
      const cov = r.pts.map(p => covered(ri, p.x, p.z));
      for (let k = 0; k < segs; k++) {
        const k2 = (k + 1) % n;
        if (L.onBridge(ri, k) && L.onBridge(ri, k2)) continue;
        const a = r.pts[k], b = r.pts[k2];
        quad(layers.shoulder, a, b, 0, SHOULDER_HALF, 0.004);
        quad(layers.asphalt, a, b, 0, ROAD_HALF, 0.007);
        if (cov[k] || cov[k2]) continue;
        quad(layers.edge, a, b, ROAD_HALF - 0.8, 0.3, 0.009);
        quad(layers.edge, a, b, -(ROAD_HALF - 0.8), 0.3, 0.009);
        if (k % 3 === 0) quad(layers.dash, a, b, 0, 0.42, 0.009);
      }
    });
    const geo = (arr: number[]) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(arr.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
      return g;
    };
    return { shoulder: geo(layers.shoulder), asphalt: geo(layers.asphalt), edge: geo(layers.edge), dash: geo(layers.dash) };
  }, [L]);
}

// An InstancedMesh filled once: n instances, each given a matrix and a colour by fill().
// 'std' is the faceted one (trunks, rocks, planks, posts); 'leaf' is foliage, shaded round with
// leaf clumps and the moon through its edges (island-shading.ts); 'glow' is unlit light.
type InstKind = 'std' | 'leaf' | 'glow';
const instMats = new Map<string, THREE.Material>();
function instMat(kind: InstKind) {
  let m = instMats.get(kind);
  if (!m) {
    m = kind === 'std' ? isle(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0, flatShading: true }), 'built')
      : kind === 'leaf' ? isle(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82, metalness: 0 }), 'leaf')
      : new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    instMats.set(kind, m);
  }
  return m;
}
type Inst = { p: V3; s: V3; r?: V3; c: string };
function instanced(geo: THREE.BufferGeometry, list: Inst[], kind: InstKind = 'std') {
  const mesh = new THREE.InstancedMesh(geo, instMat(kind), Math.max(1, list.length));
  mesh.count = list.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  const v = new THREE.Vector3(), sc = new THREE.Vector3();
  list.forEach((it, i) => {
    q.setFromEuler(e.set(...(it.r ?? [0, 0, 0])));
    m.compose(v.set(...it.p), q, sc.set(...it.s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, col.set(it.c));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function useBridges(L: TownLayout) {
  return useMemo(() => {
    const planks: Inst[] = [], rails: Inst[] = [], piles: Inst[] = [];
    for (const b of L.bridges) {
      const pts = L.roads[b.road].pts;
      for (let k = b.a; k <= b.b; k++) {
        const p = pts[k], t = (k - b.a) / Math.max(1, b.b - b.a);
        const y = Math.max(heightAt(L.sdAt(p.x, p.z)), 0.03) + 0.012 + 0.05 * Math.sin(Math.PI * t);
        const yaw = Math.atan2(p.tx, p.tz), nx = -p.tz, nz = p.tx;
        planks.push({ p: [p.x * S, y, p.z * S], s: [(ROAD_HALF + 0.8) * 2 * S, 0.02, 2.15 * S], r: [0, yaw, 0], c: k % 2 ? '#f0a860' : '#de9450' });
        for (const side of [-1, 1]) {
          const x = (p.x + nx * side * (ROAD_HALF + 0.6)) * S, z = (p.z + nz * side * (ROAD_HALF + 0.6)) * S;
          rails.push({ p: [x, y + 0.035, z], s: [0.012, 0.012, 2.15 * S], r: [0, yaw, 0], c: C.rail });
          if (k % 2 === 0) {
            rails.push({ p: [x, y + 0.02, z], s: [0.012, 0.04, 0.012], r: [0, yaw, 0], c: C.rail });
            if (heightAt(L.sdAt(p.x, p.z)) < 0.01) piles.push({ p: [x, y - 0.2, z], s: [0.011, 0.4, 0.011], c: C.pile });
          }
        }
      }
    }
    // The planks carry a little warm light of their own, so the bridges read as the game's long
    // orange spans at night instead of going brown under the moon.
    const deck = instanced(G.box, planks);
    deck.material = isle(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0, flatShading: true, emissive: '#8a3c10', emissiveIntensity: 0.55 }), 'built');
    return { planks: deck, rails: instanced(G.box, rails), piles: instanced(G.cyl6, piles) };
  }, [L]);
}

/* ---------- Trees, palms, grass, rocks, road lanterns: all instanced ---------- */

// The game's six species (trees.js), as a far camera can show them: each is a top height in metres
// (least, plus up to this much more) and how far its crown reaches from the trunk, as a share of
// that height. The game's own trees stand 3.3 to 6.5 m; the page's stood 4.8 to 9.1 m and still
// read as shrubs from its low, distant camera (Andrew 2026-11-11: "make the buildings and trees
// taller too"), so they now stand 6 to 14.5 m, the pines tallest and the cherries lowest, in the
// game's own order, and about as tall against a building's walls as the game's are.
const TREES = {
  pine: { h: [9, 5.5], reach: 0.2 }, palm: { h: [7, 3], reach: 0.14 }, willow: { h: [7, 3.5], reach: 0.34 },
  cherry: { h: [6, 3], reach: 0.38 }, birch: { h: [8.5, 4.5], reach: 0.2 }, oak: { h: [7.5, 4.5], reach: 0.36 },
} as const;

// Built once per page visit and kept (the stage may unmount and remount the scene as the page
// scrolls; the meshes are simply added to the new scene).
let natureCache: ReturnType<typeof buildNature> | null = null;
const useNature = (L: TownLayout) => (natureCache ??= buildNature(L));
function buildNature(L: TownLayout) {
  {
    const rnd = seeded(42);
    const trunks: Inst[] = [], crowns: Inst[] = [], bushes: Inst[] = [], cones: Inst[] = [], fronds: Inst[] = [], tufts: Inst[] = [], rocks: Inst[] = [], blobs: Inst[] = [];
    // A soft dark patch on the ground where something stands on it (a trunk, a building), so it
    // sits in the grass instead of floating on it. All of them are one instanced mesh.
    const blob = (X: number, y: number, Z: number, d: number) => { blobs.push({ p: [X, y + 0.004, Z], s: [d, d, 1], r: [-Math.PI / 2, 0, 0], c: '#060a22' }); };
    const any = <T,>(list: readonly T[]) => list[Math.floor(rnd() * list.length)];
    // Open grass round every landmark pad, every inner building and the plaza, so they stand clear.
    const avoid = [...L.zones.map((z, i) => ({ x: z.x, z: z.z, r: i < 8 ? 25 : 17 })), ...EXTRA_HOUSES.map(h => ({ x: h.x, z: h.z, r: 12 }))];
    const clear = (x: number, z: number, pad = 0) => Math.hypot(x, z) > 30 + pad && avoid.every(a => Math.hypot(x - a.x, z - a.z) > a.r + pad);
    // Night greens: the game's tree colours (map.js GREEN, BLOSSOM, PINE; trees.js WILLOW, PALM)
    // taken down and a little toward blue under the moon, but still the game's hues.
    const greens = ['#4c8448', '#5a914e', '#3f7443', '#68984f'], blossom = ['#d98aa8', '#c97fa5', '#d9976a', '#d9b65a'], pines = ['#2f6344', '#37704a', '#2a5a40'];
    const pinks = ['#d98aa8', '#c97fa5', '#e3a0b8'], birches = ['#8fae58', '#a3b85c', '#8fae58', '#d9b65a'], willows = ['#6f9a55', '#7ba55a'];
    // The game's mix (map.js scatter, trees.js speciesOf): about a third pines; palms only on the
    // outer beaches; willows by the fresh water; and of the rest, cherries in pink, slender pale
    // birches and broad oaks. In small groves, mostly along the shores and the lobe edges, off the
    // roads (a crown never hangs over the asphalt), the zones and the plaza.
    let placed = 0;
    const palm = (x: number, z: number, lean: number, ang: number, h: number) => {
      const sd = L.sdAt(x, z), X = x * S, Z = z * S, ox = Math.cos(ang) * lean, oz = Math.sin(ang) * lean, y0 = heightAt(sd);
      for (let i = 0; i < 3; i++) trunks.push({ p: [X + ox * h * (i + 0.5) / 3, y0 + h * (i + 0.5) / 3, Z + oz * h * (i + 0.5) / 3], s: [0.0095 - i * 0.0014, h / 3, 0.0095 - i * 0.0014], r: [oz, 0, -ox], c: i % 2 ? '#a0714a' : '#b5855a' });
      const tx = X + ox * h, ty = y0 + h, tz = Z + oz * h;
      for (let i = 0; i < 7; i++) {
        const b = (i / 7) * Math.PI * 2 + rnd();
        fronds.push({ p: [tx + Math.cos(b) * 0.045, ty - 0.012, tz + Math.sin(b) * 0.045], s: [0.02, 0.105, 0.006], r: [Math.sin(b) * 1.3, 0, -Math.cos(b) * 1.3], c: i % 2 ? '#3f7a44' : '#4c8a4a' });
      }
      blob(X, y0, Z, h * 0.5);
    };
    // Groves: a slow sine mask picks where trees may clump, the shore pulls them toward the water,
    // and each accepted spot drops a small cluster of two to four.
    for (let tries = 0; tries < 60000 && placed < 700; tries++) { // "there should be trees" (Andrew 2026-11-04); a few fewer now that each is bigger
      const cx = (rnd() * 2 - 1) * 172, cz = (rnd() * 2 - 1) * 172;
      const csd = L.sdAt(cx, cz);
      if (csd > -5) continue;
      const shore = 1 - THREE.MathUtils.smoothstep(-csd, 8, 26);
      const forest = Math.sin(cx * 0.045 + 1.3) * Math.sin(cz * 0.05 + 0.4) + 0.4 * Math.sin((cx + cz) * 0.09);
      if (rnd() > 0.18 + 0.75 * shore * (forest > -0.2 ? 1 : 0.4)) continue;
      const n = 2 + Math.floor(rnd() * 3);
      for (let t = 0; t < n && placed < 700; t++) {
        const x = cx + (rnd() - 0.5) * 9, z = cz + (rnd() - 0.5) * 9;
        const sd = L.sdAt(x, z);
        if (sd > -4 || !clear(x, z)) continue;
        const kind = rnd(), wet = rnd(), leafy = rnd(), size = rnd();
        const beach = sd > -9 && L.coast(Math.atan2(z, x)) - Math.hypot(x, z) < 13;
        const sp = kind < 0.3 ? 'pine' : beach ? 'palm' : sd > -8 && wet < 0.6 ? 'willow' : leafy < 0.17 ? 'cherry' : leafy < 0.45 ? 'birch' : 'oak';
        const H = (TREES[sp].h[0] + TREES[sp].h[1] * size) * S, reach = TREES[sp].reach * H;
        // clear of the road by the crown's own reach (the road grid is 2 m, so a little more)
        if (L.roadDistAt(x, z) < Math.max(SHOULDER_HALF + 2.5, ROAD_HALF + 1.5 + reach / S)) continue;
        placed++;
        if (sp === 'palm') { palm(x, z, 0.15, rnd() * 6.3, H); continue; }
        const X = x * S, Z = z * S, y0 = heightAt(sd), turn = (): V3 => [rnd() * 0.5, rnd() * 3, 0];
        blob(X, y0, Z, reach * 2.7);
        if (sp === 'pine') {
          // a bare foot of trunk, then three tiers narrowing to a point
          const c = any(pines);
          trunks.push({ p: [X, y0 + H * 0.12, Z], s: [0.009, H * 0.24, 0.009], c: '#5e4030' });
          for (const [r, hh, base] of [[0.2, 0.42, 0.16], [0.155, 0.38, 0.4], [0.105, 0.36, 0.64]]) cones.push({ p: [X, y0 + H * (base + hh / 2), Z], s: [H * r, H * hh, H * r], r: [0, rnd() * 6, 0], c });
          continue;
        }
        // a second, lower mass beside the first: an oak's or a cherry's broad, lumpy crown
        const lobe = (off: number, y: number, r: number, ry: number, c: string) => {
          const a = rnd() * 6.3;
          crowns.push({ p: [X + Math.cos(a) * H * off, y0 + H * y, Z + Math.sin(a) * H * off], s: [H * r, H * ry, H * r], r: turn(), c });
        };
        if (sp === 'oak') {
          const c = leafy > 0.93 ? '#d9976a' : any(greens);
          trunks.push({ p: [X, y0 + H * 0.25, Z], s: [0.011, H * 0.5, 0.011], c: C.trunk });
          crowns.push({ p: [X, y0 + H * 0.72, Z], s: [H * 0.26, H * 0.28, H * 0.26], r: turn(), c });
          lobe(0.17, 0.56, 0.19, 0.17, c === '#d9976a' ? c : any(greens));
        } else if (sp === 'cherry') {
          const c = any(pinks);
          trunks.push({ p: [X, y0 + H * 0.2, Z], s: [0.01, H * 0.4, 0.01], c: '#5a3a34' });
          crowns.push({ p: [X, y0 + H * 0.71, Z], s: [H * 0.29, H * 0.29, H * 0.29], r: turn(), c });
          lobe(0.17, 0.57, 0.21, 0.18, any(pinks));
        } else if (sp === 'birch') {
          trunks.push({ p: [X, y0 + H * 0.3, Z], s: [0.0065, H * 0.6, 0.0065], c: '#c4bfd0' });
          crowns.push({ p: [X, y0 + H * 0.68, Z], s: [H * 0.18, H * 0.32, H * 0.18], r: [0, rnd() * 3, 0], c: any(birches) });
        } else {
          // a willow: a dome over a wider, lower skirt, so the crown hangs toward the water
          const c = any(willows);
          trunks.push({ p: [X, y0 + H * 0.25, Z], s: [0.011, H * 0.5, 0.011], c: '#6a5646' });
          crowns.push({ p: [X, y0 + H * 0.73, Z], s: [H * 0.27, H * 0.27, H * 0.27], r: turn(), c });
          crowns.push({ p: [X, y0 + H * 0.52, Z], s: [H * 0.34, H * 0.28, H * 0.34], r: turn(), c });
        }
      }
    }
    // Bushes: a few low round shrubs along the roadsides, a few in blossom.
    const bushCols = ['#4c8448', '#5a914e', '#68984f', '#3f7443', '#6b8f52'];
    for (let k = 0, n = 0; k < 30000 && n < 420; k++) {
      const x = (rnd() * 2 - 1) * 172, z = (rnd() * 2 - 1) * 172, sd = L.sdAt(x, z), rd = L.roadDistAt(x, z);
      if (sd > -5 || rd < SHOULDER_HALF + 1 || !clear(x, z, -12)) continue;
      if (rd > 12 && rnd() > 0.25) continue; // mostly along the roads
      n++;
      const b = (0.022 + rnd() * 0.02), y0 = heightAt(sd);
      bushes.push({ p: [x * S, y0 + b * 0.55, z * S], s: [b * 1.2, b * 0.8, b * 1.1], r: [rnd(), rnd() * 3, 0], c: rnd() < 0.15 ? blossom[Math.floor(rnd() * 4)] : bushCols[Math.floor(rnd() * 5)] });
    }
    // Palms on the outer beaches, leaning out to sea
    for (let k = 0, n = 0; k < 500 && n < 30; k++) {
      const a = rnd() * Math.PI * 2, r0 = L.coast(a) - 3;
      const x = Math.cos(a) * r0, z = Math.sin(a) * r0, sd = L.sdAt(x, z);
      if (sd < -5 || sd > -1.5 || !clear(x, z) || L.roadDistAt(x, z) < 9) continue;
      n++;
      palm(x, z, 0.3, a, (TREES.palm.h[0] + TREES.palm.h[1] * rnd()) * S);
    }
    // Tall grass clumps along the banks and in the open meadows (art.js): a few thin blades each.
    const tallCols = ['#47704a', '#517b4f', '#5c8656', '#3d6444'];
    for (let k = 0, n = 0; k < 8000 && n < 300; k++) {
      const x = (rnd() * 2 - 1) * 172, z = (rnd() * 2 - 1) * 172, sd = L.sdAt(x, z);
      if (sd > -4.5 || L.roadDistAt(x, z) < SHOULDER_HALF + 1.5 || !clear(x, z, -4)) continue;
      if (sd < -12 && rnd() > 0.35) continue; // mostly along the banks
      n++;
      const c = tallCols[Math.floor(rnd() * 4)];
      for (let i = 0; i < 3; i++) {
        const b = rnd() * 6.3, hh = 0.04 + rnd() * 0.03;
        tufts.push({ p: [x * S + Math.cos(b) * 0.012, heightAt(sd) + hh / 2, z * S + Math.sin(b) * 0.012], s: [0.008, hh, 0.008], r: [Math.cos(b) * 0.3, 0, Math.sin(b) * 0.3], c });
      }
    }
    // Grass tufts across the land
    const tuftCols = ['#47704a', '#517b4f', '#3d6444', '#5c8656', '#628a58'];
    for (let k = 0, n = 0; k < 16000 && n < 3200; k++) {
      const x = (rnd() * 2 - 1) * 172, z = (rnd() * 2 - 1) * 172;
      if (L.sdAt(x, z) > -6 || L.roadDistAt(x, z) < SHOULDER_HALF + 0.8 || !clear(x, z, -6)) continue;
      n++;
      tufts.push({ p: [x * S, GROUND + 0.012, z * S], s: [0.011, 0.024 + rnd() * 0.016, 0.011], r: [0, rnd() * 3, 0], c: tuftCols[Math.floor(rnd() * 5)] });
    }
    // Grey-lilac rocks along the outer shore
    for (let k = 0, n = 0; k < 900 && n < 46; k++) {
      const a = rnd() * Math.PI * 2, r0 = L.coast(a) + (rnd() - 0.5) * 3;
      const x = Math.cos(a) * r0, z = Math.sin(a) * r0, sd = L.sdAt(x, z);
      if (sd < -1.5 || sd > 2.5 || !clear(x, z, -10)) continue;
      n++;
      const s = 0.03 + rnd() * 0.05;
      rocks.push({ p: [x * S, Math.max(heightAt(sd), -0.04), z * S], s: [s * 1.3, s * 0.8, s], r: [rnd() * 2, rnd() * 3, 0], c: rnd() < 0.5 ? '#c9c2b8' : '#b9b2c7' });
    }
    // The buildings' own patches (the dock stands over the water, so it has none).
    L.zones.forEach((z, i) => { if (i !== 3) for (const k of [1, 0.66]) blob(z.x * S, GROUND + 0.005, z.z * S, (i < 8 ? 1.2 : 0.85) * k); });
    EXTRA_HOUSES.forEach(h => blob(h.x * S, GROUND, h.z * S, 0.62));
    const blobMesh = instanced(new THREE.PlaneGeometry(1, 1), blobs);
    blobMesh.material = new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false });
    // Foliage is shaded round, with leaf clumps (the 'leaf' material): the crowns on an 80-face
    // ball, the bushes on the old 20-face one with rounded normals.
    return {
      trunks: instanced(G.cyl6, trunks), crowns: instanced(G.ball, crowns, 'leaf'), bushes: instanced(G.blob, bushes, 'leaf'),
      cones: instanced(G.cone7, cones, 'leaf'), fronds: instanced(G.cone4, fronds, 'leaf'), tufts: instanced(G.cone4, tufts, 'leaf'),
      rocks: instanced(G.dodec, rocks), blobs: blobMesh,
    };
  }
}

// A soft round glow texture for the lanterns' pools of light on the ground.
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.4, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Lanterns along the roads at night (the game's orange threads): a post, a lit bulb and a small
// warm pool at its foot, every 10 m, alternating sides. The pools stay small and apart, so the
// lamps read as separate dots and the asphalt between them stays dark plum, as in the game.
const LAMP_H = 0.125; // 3.6 m, about the game's street lamps (0.09 before)
function useLanterns(L: TownLayout) {
  return useMemo(() => {
    const posts: Inst[] = [], bulbs: Inst[] = [], pools: Inst[] = [];
    L.roads.forEach((r, ri) => {
      for (let k = 0; k < r.pts.length; k += 5) {
        if (L.onBridge(ri, k)) continue;
        const p = r.pts[k], side = (k / 5) % 2 ? 1 : -1, off = SHOULDER_HALF + 0.6;
        const x = (p.x - p.tz * side * off) * S, z = (p.z + p.tx * side * off) * S;
        posts.push({ p: [x, GROUND + LAMP_H / 2, z], s: [0.004, LAMP_H, 0.004], c: '#3a3350' });
        bulbs.push({ p: [x, GROUND + LAMP_H + 0.005, z], s: [0.02, 0.02, 0.02], c: '#ffd28a' });
        pools.push({ p: [x, GROUND + 0.011, z], s: [0.16, 0.16, 1], r: [-Math.PI / 2, 0, 0], c: '#ff9a3c' });
      }
    });
    // The lit windows spill onto the ground: one wider, fainter warm pool before each building's
    // door (its side toward the plaza), so the fronts glow against the cool moonlight.
    const spill = (x: number, z: number, off: number, size: number) => {
      const r = Math.hypot(x, z) || 1;
      pools.push({ p: [x * S - (x / r) * off, GROUND + 0.012, z * S - (z / r) * off], s: [size, size, 1], r: [-Math.PI / 2, 0, 0], c: '#b8641f' });
    };
    L.zones.forEach((z, i) => spill(z.x, z.z, i < 8 ? 0.3 : 0.2, i < 8 ? 0.62 : 0.44));
    EXTRA_HOUSES.forEach(h => spill(h.x, h.z, 0.14, 0.32));
    const poolMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffffff', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const poolMesh = instanced(new THREE.PlaneGeometry(1, 1), pools);
    poolMesh.material = poolMat;
    return { posts: instanced(G.cyl6, posts), bulbs: instanced(G.ball, bulbs, 'glow'), pools: poolMesh };
  }, [L]);
}

/* ---------- The car, going round the outer loop like the game's ---------- */
function Car({ still, L }: { still: boolean; L: TownLayout }) {
  const ref = useRef<THREE.Group>(null);
  const loop = L.roads[0].pts;
  const place = (t: number) => {
    const g = ref.current;
    if (!g) return;
    const u = ((t * 6 + 40) / 2) % loop.length, k = Math.floor(u), f = u - k;
    const a = loop[k], b = loop[(k + 1) % loop.length];
    const side = 1.9; // keep right
    const x = a.x + (b.x - a.x) * f - a.tz * side, z = a.z + (b.z - a.z) * f + a.tx * side;
    g.position.set(x * S, GROUND + 0.008, z * S);
    g.rotation.y = Math.atan2(a.tx, a.tz);
  };
  useLayoutEffect(() => place(0));
  useFrame(state => { if (!still) place(state.clock.elapsedTime); });
  return <group ref={ref} scale={0.42}>
    <Part geo={G.box} color="#5b6fd6" p={[0, 0.07, 0]} s={[0.2, 0.08, 0.36]} />
    <Part geo={G.box} color={C.card} p={[0, 0.14, -0.02]} s={[0.17, 0.08, 0.18]} />
    {[-0.06, 0.06].map(x => <Part key={x} geo={G.box} color={C.gold} glow={1.8} p={[x, 0.07, 0.185]} s={[0.04, 0.03, 0.01]} />)}
  </group>;
}

function Land({ L }: { L: TownLayout }) {
  const terrain = useTerrain(L);
  const roads = useRoads(L);
  const bridges = useBridges(L);
  return <group>
    <mesh geometry={terrain.geo} material={terrain.material} />
    <mesh geometry={roads.shoulder} material={mat(C.shoulder)} />
    <mesh geometry={roads.asphalt} material={mat(C.road)} />
    <mesh geometry={roads.edge} material={mat(C.edge)} />
    <mesh geometry={roads.dash} material={mat(C.dash, { glow: 0.35 })} />
    <primitive object={bridges.planks} />
    <primitive object={bridges.rails} />
    <primitive object={bridges.piles} />
    {/* the round brick plaza (a darker course of tiles in rings), the garage on its north-west
        edge, the ANDREW / LIU blocks in front of it and the welcome board */}
    <Part geo={G.disc} color={C.shoulder} p={[0, GROUND + 0.006, 0]} s={[13 * S, 0.01, 13 * S]} />
    <Part geo={G.disc} color={C.brick} p={[0, GROUND + 0.011, 0]} s={[11 * S, 0.01, 11 * S]} />
    {[3.2, 6.4, 9.6].map(r => <mesh key={r} geometry={G.torus} material={mat('#c98f62')} position={[0, GROUND + 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[r * S, r * S, 0.02]} />)}
    <group position={[-9 * S, GROUND + 0.012, -10 * S]} rotation={[0, 0.72, 0]} scale={[S, S * 1.3, S]}><Garage /></group>
    <group position={[4 * S, GROUND + 0.016, -3 * S]} rotation={[0, -0.45, 0]} scale={S}><Blocks /></group>
    <group position={[-10.5 * S, GROUND, 1 * S]} rotation={[0, 1.2, 0]} scale={S}>
      {[-2, 2].map(x => <Part key={x} geo={G.box} color="#6b4a33" p={[x, 1.2, 0]} s={[0.25, 2.4, 0.25]} />)}
      <Part geo={G.box} color={C.card} glow={0.25} p={[0, 2.3, 0.05]} s={[5.2, 2.2, 0.2]} />
    </group>
  </group>;
}

function Nature({ L }: { L: TownLayout }) {
  const n = useNature(L);
  return <group>
    <primitive object={n.trunks} />
    <primitive object={n.crowns} />
    <primitive object={n.bushes} />
    <primitive object={n.cones} />
    <primitive object={n.fronds} />
    <primitive object={n.rocks} />
  </group>;
}
// The grass tufts: too small to cast a shadow worth its cost, so outside the shadow pass, with the
// soft dark patches under the trees and the buildings.
function Tufts({ L }: { L: TownLayout }) {
  const n = useNature(L);
  return <group>
    <primitive object={n.tufts} />
    <primitive object={n.blobs} />
  </group>;
}
// The lanterns stay out of the shadow pass: they are light, and thin enough not to need it.
function Lanterns({ L }: { L: TownLayout }) {
  const lights = useLanterns(L);
  return <group>
    <primitive object={lights.posts} />
    <primitive object={lights.bulbs} />
    <primitive object={lights.pools} />
  </group>;
}

// The ocean's distance to the shore (island units, positive over water) from the land texture,
// easing into a plain ring far out where the texture ends.
const COAST_GLSL = /* glsl */ `
  uniform sampler2D uLand;
  uniform float uLandMin, uLandSize;
  float coastD(vec2 p) {
    vec2 uv = (p - uLandMin) / uLandSize;
    float d = texture2D(uLand, uv).r * 6.0 - 1.0;
    float e = smoothstep(0.42, 0.49, max(abs(uv.x - 0.5), abs(uv.y - 0.5)));
    return mix(d, max(d, length(p) - 5.6), e);
  }
`;

/* ---------- The ocean ---------- */

// One mesh of rings round the island, fine near the shore (where the waves lap the beach) and
// coarser and coarser out to 860 units, which is a few pixels under the horizon. Four Gerstner
// waves move the vertices (the swell). The ripples on top are a normal map, built once on the CPU
// (waterNormals, below) and read four times at different sizes, angles and speeds, as three.js's
// Water does: the sizes never line up, so it never looks tiled, and its mipmaps squash the ripples
// into thin streaks as the water runs away to the horizon.
// Under the ripples run three long, slow swells (analytic slopes in the fragment shader), so the
// near water has broad wave shapes; a close-up chop of small ripples keeps it crisp to the frame's
// foot, and bigger reads take over toward the horizon. The normals carry the night sky in the water by Fresnel, the moon's glitter (level
// streaks on a narrow lobe, kept inside a column under the moon that widens toward the viewer), a
// little moonlight on the facets turned toward it, navy deep water that turns teal over the
// sand, and foam that laps the beach. The far water melts into the horizon's colour, the same
// colour the sky band (Sky) starts from, so the sea meets the page's sky along one line.

const SKY = {
  haze: '#1d2453', // the horizon line: lighter than the page's sky there (#111433), so the sky glows down to it
  zenith: '#151a3f', // the night overhead, as the water reflects it
  deep: '#06102a', mid: '#0b2a5c', shallow: '#1a7fe0', shore: '#3fe4ff', // the coasts glow neon cyan over electric blue at night, as the game's do (atmosphere.js)
  foam: '#dbe6f4', moon: '#e8ecff',
};
// The moon's direction (world space), set by Framing for each layout; the ocean and the sky share it.
const moonDir = new THREE.Vector3(-0.2, 0.1, -1).normalize();
// The island's materials (island-shading.ts) read the same moon, its colour and the same haze.
isleU.uIsleMoon.value = moonDir;
isleU.uIsleMoonCol.value.set(SKY.moon);
isleU.uIsleHaze.value.set(SKY.haze);
isleU.uIsleGround.value = GROUND;

function ringGeometry() {
  const SEG = 144;
  const radii: number[] = [];
  for (let r = 0.06; r < 14; r += 0.18) radii.push(r);
  for (let r = 14; r < 860; r *= 1.055) radii.push(r);
  radii.push(860);
  const pos = new Float32Array(radii.length * (SEG + 1) * 3);
  let k = 0;
  for (let s = 0; s <= SEG; s++) {
    const a = (s / SEG) * Math.PI * 2, cx = Math.cos(a), sz = Math.sin(a);
    for (const r of radii) { pos[k++] = cx * r; pos[k++] = 0; pos[k++] = sz * r; }
  }
  const idx: number[] = [];
  const n = radii.length;
  for (let s = 0; s < SEG; s++) for (let j = 0; j < n - 1; j++) {
    const a = s * n + j, b = (s + 1) * n + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

// A tiling ripple texture, made here instead of downloaded: 48 small waves with whole-number
// wave vectors (so the tile wraps), most of them heading roughly downwind, longer ones stronger.
// RGB is the surface normal (x, y across the tile, z up); A is the height, which the foam reads.
// Each wave's sine splits into an x part and a y part, so the 256 x 256 pixels cost only
// multiply-adds: a few milliseconds, once.
function waterNormals(gl: THREE.WebGLRenderer) {
  const N = 128, W = 40, TAU = Math.PI * 2; // lighter (Andrew 2026-11-04: the island took too long to load)
  const rnd = seeded(11);
  const kx = new Int16Array(W), ky = new Int16Array(W), amp = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    const f = 2 + Math.round(Math.pow(rnd(), 1.7) * 26);
    const th = 0.5 + (rnd() - 0.5) * 2.4 + (rnd() < 0.2 ? Math.PI * 0.5 : 0);
    const y = Math.round(Math.sin(th) * f), x = Math.round(Math.cos(th) * f) || (y ? 0 : f);
    kx[i] = x; ky[i] = y;
    amp[i] = (0.6 + 0.8 * rnd()) / Math.pow(Math.hypot(x, y), 1.35);
  }
  // cos and sin of each wave's x phase (per column) and y phase plus offset (per row)
  const cx = new Float32Array(W * N), sx = new Float32Array(W * N), cy = new Float32Array(W * N), sy = new Float32Array(W * N);
  for (let i = 0; i < W; i++) {
    const ph = rnd() * TAU;
    for (let t = 0; t < N; t++) {
      const ax = (TAU * kx[i] * t) / N, ay = (TAU * ky[i] * t) / N + ph;
      cx[i * N + t] = Math.cos(ax); sx[i * N + t] = Math.sin(ax);
      cy[i * N + t] = Math.cos(ay); sy[i * N + t] = Math.sin(ay);
    }
  }
  const h = new Float32Array(N * N), dx = new Float32Array(N * N), dy = new Float32Array(N * N);
  let maxS = 0, minH = Infinity, maxH = -Infinity;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let hh = 0, gx = 0, gy = 0;
    for (let i = 0; i < W; i++) {
      const a = i * N;
      const s = sx[a + x] * cy[a + y] + cx[a + x] * sy[a + y]; // sin(ax + ay)
      const c = cx[a + x] * cy[a + y] - sx[a + x] * sy[a + y]; // cos(ax + ay)
      hh += amp[i] * s; gx += amp[i] * kx[i] * c; gy += amp[i] * ky[i] * c;
    }
    const k = y * N + x;
    h[k] = hh; dx[k] = gx; dy[k] = gy;
    maxS = Math.max(maxS, Math.abs(gx), Math.abs(gy)); minH = Math.min(minH, hh); maxH = Math.max(maxH, hh);
  }
  const data = new Uint8Array(N * N * 4);
  const tilt = 1.6 / maxS;
  for (let k = 0; k < N * N; k++) {
    const nx = -dx[k] * tilt, ny = -dy[k] * tilt, l = Math.hypot(nx, ny, 1);
    data[k * 4] = Math.round((nx / l * 0.5 + 0.5) * 255);
    data[k * 4 + 1] = Math.round((ny / l * 0.5 + 0.5) * 255);
    data[k * 4 + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
    data[k * 4 + 3] = Math.round(((h[k] - minH) / (maxH - minH)) * 255);
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  return tex;
}

const OCEAN_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec2 vLocal;
  varying vec3 vNormalW;
  ${COAST_GLSL}

  // One Gerstner wave: direction, wavelength, amplitude, sharpness. Adds its displacement and the
  // partial derivatives the normal is built from.
  void gerstner(vec2 p, vec2 dir, float len, float amp, float q, inout vec3 disp, inout vec3 dn) {
    float k = 6.2831853 / len;
    float c = sqrt(9.8 / k) * 0.32;
    float f = k * (dot(dir, p) - c * uTime);
    float cf = cos(f), sf = sin(f);
    disp += vec3(q * amp * dir.x * cf, amp * sf, q * amp * dir.y * cf);
    dn += vec3(dir.x * k * amp * cf, q * k * amp * sf, dir.y * k * amp * cf);
  }

  void main() {
    vec2 p = position.xz;
    float r = length(p);
    float d = coastD(p);
    // Calmer at the beach (the waves just lap it), nearly still in the rivers and lakes, full
    // swell offshore, flat far away.
    float amp = mix(0.35, 1.0, smoothstep(0.0, 3.0, d)) * mix(0.2, 1.0, smoothstep(4.2, 5.8, r)) * (1.0 - smoothstep(40.0, 90.0, r));
    vec3 disp = vec3(0.0), dn = vec3(0.0);
    gerstner(p, normalize(vec2(0.8, 0.6)), 13.0, 0.075 * amp, 0.6, disp, dn);
    gerstner(p, normalize(vec2(0.3, 1.0)), 7.5, 0.045 * amp, 0.6, disp, dn);
    gerstner(p, normalize(vec2(-0.6, 0.8)), 4.6, 0.028 * amp, 0.5, disp, dn);
    gerstner(p, normalize(vec2(1.0, -0.2)), 3.1, 0.018 * amp, 0.5, disp, dn);
    vec3 pos = position + disp;
    vLocal = p;
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * vec3(-dn.x, 1.0 - dn.y, -dn.z));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// The horizon's colour in a direction: the haze, brighter under the moon. The sky band and the
// ocean's fog both use it, so the two meet without a seam.
const HORIZON_GLSL = /* glsl */ `
  vec3 horizon(vec3 dir) {
    float az = max(dot(normalize(dir.xz + vec2(1e-5)), normalize(uMoonDir.xz)), 0.0);
    // a broad lift toward the moon's side, then a tighter glow and a bright spot right under it
    return uHaze + uMoonCol * (0.035 * az * az * az + 0.07 * pow(az, 18.0) + 0.06 * pow(az, 260.0));
  }
`;

const OCEAN_FRAG = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uNormals;
  uniform vec3 uMoonDir, uMoonCol, uHaze, uZenith, uDeep, uMid, uShallow, uShore, uFoam;
  varying vec3 vWorld;
  varying vec2 vLocal;
  varying vec3 vNormalW;
  ${COAST_GLSL}
  ${HORIZON_GLSL}

  // One read of the ripple tile: p in world units, the tile's size, its angle and its drift.
  vec4 layer(vec2 p, float size, float ang, vec2 drift) {
    float c = cos(ang), s = sin(ang);
    return texture2D(uNormals, mat2(c, s, -s, c) * p / size + drift * uTime / size);
  }

  // One long, slow swell as a slope (the gradient of its height), faded out once it would be
  // too fine for the pixels it lands on, so the far water never shimmers with it.
  vec2 swell(vec2 p, vec2 dir, float len, float slope, float dist) {
    float k = 6.2831853 / len;
    float w = sqrt(9.8 * k) * 0.45;
    float fade = 1.0 - smoothstep(len * 5.0, len * 11.0, dist);
    return dir * slope * cos(k * dot(dir, p) - w * uTime) * fade;
  }

  void main() {
    vec3 toCam = cameraPosition - vWorld;
    float dist = length(toCam);
    vec3 V = toCam / dist;
    vec2 p = vWorld.xz;

    // The swell: three long, low waves crossing at angles, so the near water shows broad, smooth
    // wave shapes that the moonlight slides along.
    vec2 sw = swell(p, normalize(vec2(0.97, 0.22)), 34.0, 0.075, dist)
            + swell(p, normalize(vec2(0.92, 0.38)), 17.0, 0.085, dist)
            + swell(p, normalize(vec2(0.55, 0.83)), 10.5, 0.07, dist)
            + swell(p, normalize(vec2(-0.35, 0.94)), 6.8, 0.05, dist);

    // The ripples ride on it: reads of the tile at sizes that never line up, each drifting its own
    // way. The small ones carry the near water (a chop of crisp facets right down to the frame's
    // foot, the smallest a close-up layer of its own) and hand over to the big ones with distance,
    // before they would blur flat in their mipmaps.
    vec4 t0 = layer(p, 6.3, 0.0, vec2(0.46, 0.18));
    vec4 t1 = layer(p, 2.9, 0.55, vec2(-0.18, 0.36));
    vec4 t2 = layer(p, 1.13, -0.4, vec2(0.25, -0.13));
    vec4 t3 = layer(p, 19.0, 0.3, vec2(0.6, 0.28));
    vec4 t4 = layer(p, 0.47, 1.9, vec2(-0.11, 0.17));
    float nearL = 1.0 - smoothstep(16.0, 46.0, dist);
    float midL = 1.0 - smoothstep(70.0, 190.0, dist);
    vec3 rip = (t3.xyz - 0.5) * mix(1.0, 0.7, nearL) + (t0.xyz - 0.5) * 0.75
             + ((t1.xyz - 0.5) * 0.6 + (t2.xyz - 0.5) * 0.45) * midL + (t4.xyz - 0.5) * 0.3 * nearL;
    // Far out the small tiles blur flat in their mipmaps, so two much bigger reads take over there:
    // they squash into the long level streaks that carry the texture right up to the horizon.
    float far = smoothstep(120.0, 380.0, dist);
    if (far > 0.0) rip += ((layer(p, 85.0, 1.1, vec2(0.9, 0.4)).xyz - 0.5) * 1.1 + (layer(p, 240.0, -0.7, vec2(-0.5, 1.2)).xyz - 0.5) * 0.9) * far;
    // Wind patches: one very big, slow read of the tile's height sets how choppy each stretch is,
    // so the near water has calm slicks and rougher patches instead of one even grain.
    float gust = layer(p, 58.0, 0.8, vec2(0.21, 0.09)).w;
    float ripK = 0.36 * mix(0.45, 1.35, smoothstep(0.25, 0.8, gust)) * (1.0 - 0.7 * smoothstep(160.0, 760.0, dist));
    vec3 N = normalize(vNormalW + vec3(sw.x + rip.x * ripK, 0.0, sw.y + rip.y * ripK));

    // Water body: navy offshore, teal over the sand, lighter at the beach. The depth line wobbles
    // with the long ripples' height, so the shallows are not a perfect ring.
    float ang = atan(vLocal.y, vLocal.x);
    float d = coastD(vLocal);
    float dw = d + (t3.w - 0.5) * 0.9 + (t0.w - 0.5) * 0.3;
    vec3 body = mix(uDeep, uMid, 1.0 - smoothstep(1.0, 11.0, dw));
    body = mix(body, uShallow * 0.65, pow(1.0 - smoothstep(0.1, 1.3, dw), 1.6));
    body = mix(body, uShore, 0.8 * (1.0 - smoothstep(0.0, 0.32, d)));
    // a little moonlight on the facets that face it
    body *= 0.7 + 0.9 * max(dot(N, uMoonDir), 0.0);

    // The sky in the water, by Fresnel: the horizon at grazing angles, the night above when looking
    // down, and the moon's halo, which makes the soft column of the glitter path.
    // The moon's column: how far this bit of water is, sideways, from the line under the moon, as
    // seen from the camera. The column is narrow at the horizon and widens toward the viewer, and
    // every trace of moonlight in the water stays inside it.
    vec2 look = normalize(-V.xz + vec2(1e-5));
    vec2 mxz = normalize(uMoonDir.xz);
    float side = look.x * mxz.y - look.y * mxz.x;
    float width = 0.04 + 0.62 * max(V.y, 0.0);
    float column = exp(-side * side / (width * width)) * step(0.0, dot(look, mxz));

    float ndv = max(dot(N, V), 0.0);
    float fres = 0.12 + 0.88 * pow(1.0 - ndv, 5.0);
    vec3 R = reflect(-V, N);
    R.y = abs(R.y);
    float rm = max(dot(R, uMoonDir), 0.0);
    // A broad sheen toward the moon's side of the sky, everywhere, so every facet in the near water
    // catches a little sky-coloured light and the wave shapes read right down to the frame's foot.
    vec3 sky = mix(horizon(R) * 1.3, uZenith * 1.1, smoothstep(0.0, 0.4, R.y)) + uZenith * 0.9 * pow(rm, 4.0)
             + uMoonCol * (pow(rm, 160.0) * 0.06 + pow(rm, 900.0) * 0.35) * column;
    vec3 col = mix(body, sky, clamp(fres, 0.0, 1.0));
    // The game's night shallows glow: a neon halo hugging every coast, river and lake, brightest
    // at the sand, laid over the reflection so the sky never greys it.
    // Scene r2: it falls off with depth (strong over the sand, gone a few metres out) instead of one
    // even band, is uneven along the coast (the wind patches), and is brightest where the facets
    // catch the moon, so it reads as lit shallows rather than an outline.
    float halo = pow(1.0 - smoothstep(0.0, 0.6, dw), 2.2);
    float lit = 0.35 + 0.9 * max(dot(N, uMoonDir), 0.0) + 0.5 * column;
    float patchy = mix(0.55, 1.1, smoothstep(0.3, 0.75, gust));
    col += (uShallow * 0.32 * halo + uShore * 0.34 * (1.0 - smoothstep(0.0, 0.16, d))) * lit * patchy * (0.8 + 0.4 * t0.w);

    // The moon's glitter: a narrow lobe on the half vector, looser sideways than up and down, so a
    // glint on a wave crest draws out into a short level streak instead of a dot, plus a softer lobe
    // for the path's glow. Both live only inside the column.
    vec3 H = normalize(V + uMoonDir);
    float nh = max(dot(N, H), 1e-3);
    vec3 dev = N / nh - H; // the normal's tilt off the half vector
    vec3 across = normalize(vec3(-H.z, 0.0, H.x));
    vec3 along = cross(across, H);
    float ta = dot(dev, across), tb = dot(dev, along);
    float nearK = smoothstep(8.0, 30.0, dist);
    float streak = exp(-(ta * ta / mix(0.004, 0.0022, nearK) + tb * tb / 0.00035)) * mix(0.45, 1.0, nearK);
    float glow = exp(-(ta * ta + tb * tb) / 0.004);
    // Close up, the path breaks into scattered sparkles: the crests of the small ripples that tip
    // toward the moon, on a lobe that loosens toward the viewer, with a few strays outside it.
    float crest = smoothstep(0.7, 0.92, t4.w * 0.6 + t2.w * 0.4);
    float loose = exp(-(ta * ta + tb * tb) / 0.03);
    float sparkle = crest * loose * (1.0 - nearK) * (column + 0.02);
    vec3 spec = uMoonCol * ((streak * 1.5 + glow * 0.22) * column + sparkle * 1.1);

    // Foam: a broken line where the water meets the sand, breathing in and out, a lacy fringe just
    // off it, and thin surf lines rolling in to the beach, all torn up by the ripple heights.
    float lace = t1.w * 0.55 + t2.w * 0.45;
    float edge = d - 0.05 * sin(uTime * 0.8 + ang * 5.0) + (lace - 0.5) * 0.14;
    float line = 1.0 - smoothstep(0.0, 0.12, edge);
    float fringe = smoothstep(0.6, 0.78, lace) * (1.0 - smoothstep(0.05, 0.55, d));
    float roll = smoothstep(0.86, 0.98, sin(d * 6.0 + uTime * 1.1 + t3.w * 3.0))
               * (1.0 - smoothstep(0.1, 1.1, d)) * smoothstep(0.42, 0.62, lace);
    float foam = clamp(line + fringe * 0.6 + roll * 0.5, 0.0, 1.0);
    col = mix(col, uFoam * (0.75 + 0.35 * max(dot(N, uMoonDir), 0.0)), foam * 0.85);

    // Into the horizon: a light haze that thickens only in the last stretch, so the ripples
    // stream nearly all the way out; the glitter fades less.
    float rr = length(vLocal);
    // The far sea settles a shade under the sky's line (horizon * 0.86), so where they meet there
    // is a line: the sky glows just above it and the water, lit by the sky at grazing angles,
    // sits just below.
    float fog = 1.0 - exp(-pow(dist / 640.0, 2.2));
    fog = max(fog, smoothstep(700.0, 855.0, rr));
    col = mix(col, horizon(-V) * 0.86, fog);
    col += spec * (1.0 - 0.5 * fog) * (1.0 - smoothstep(560.0, 840.0, rr));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

// The shore as a texture: the layout's signed distance (island units, -1 to 5) on its 1 m grid,
// which the ocean reads for its shallows, foam and calm water, rivers and lakes included.
function landTexture(L: TownLayout) {
  const N = Math.round(L.SIZE), data = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const d = L.sdAt(L.MIN + i + 0.5, L.MIN + j + 0.5) * S;
    data[j * N + i] = Math.round(THREE.MathUtils.clamp((d + 1) / 6, 0, 1) * 255);
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function Ocean({ still, L }: { still: boolean; L: TownLayout }) {
  const gl = useThree(s => s.gl);
  const { geo, material } = useMemo(() => {
    const u = (hex: string) => ({ value: new THREE.Color(hex) });
    const material = new THREE.ShaderMaterial({
      vertexShader: OCEAN_VERT, fragmentShader: OCEAN_FRAG,
      uniforms: {
        uTime: { value: 8 }, uNormals: { value: waterNormals(gl) }, uMoonDir: { value: moonDir }, uMoonCol: u(SKY.moon),
        uHaze: u(SKY.haze), uZenith: u(SKY.zenith), uDeep: u(SKY.deep), uMid: u(SKY.mid),
        uShallow: u(SKY.shallow), uShore: u(SKY.shore), uFoam: u(SKY.foam),
        uLand: { value: landTexture(L) }, uLandMin: { value: L.MIN * S }, uLandSize: { value: L.SIZE * S },
      },
    });
    return { geo: ringGeometry(), material };
  }, [gl, L]);
  useEffect(() => () => {
    (material.uniforms.uNormals.value as THREE.Texture).dispose();
    (material.uniforms.uLand.value as THREE.Texture).dispose();
    material.dispose(); geo.dispose();
  }, [geo, material]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(state => {
    const m = ref.current?.material as THREE.ShaderMaterial | undefined;
    if (m && !still) m.uniforms.uTime.value = 8 + state.clock.elapsedTime;
  });
  // Drawn after the land (renderOrder 1), so the depth test skips its costly shading under the island.
  return <mesh ref={ref} geometry={geo} material={material} frustumCulled={false} renderOrder={1} />;
}

/* ---------- The sky's part: the horizon haze and the moon ---------- */

// An open cylinder far round the scene, drawn only where it is needed: the haze, solid below the
// horizon (the last few pixels past the water's edge) and gone a couple of degrees above it, and
// the moon with its halo. The rest is transparent, so the page's sky and stars show through and
// the canvas has no top edge. The haze is brightest right on the line and under the moon.
const SKY_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const SKY_FRAG = /* glsl */ `
  uniform vec3 uMoonDir, uMoonCol, uHaze;
  varying vec3 vWorld;
  ${HORIZON_GLSL}
  void main() {
    vec3 dir = normalize(vWorld - cameraPosition);
    float up = max(dir.y, 0.0);
    // A glow that rises well above the line and thins out slowly, so the sky lightens toward the
    // horizon and meets the far water (fogged to the same colour) with no edge; gone long before
    // the canvas top.
    float haze = exp(-up / 0.004) * 0.35 + exp(-up / 0.018) * 0.4 + exp(-up / 0.06) * 0.25;
    haze *= 1.0 - smoothstep(0.06, 0.2, up);
    float m = max(dot(dir, uMoonDir), 0.0);
    float disc = smoothstep(0.99975, 0.99981, m);
    float halo = pow(m, 5000.0) * 0.45 + pow(m, 400.0) * 0.08;
    // the moon's face: a few soft darker seas
    vec2 q = (dir.xy - uMoonDir.xy) * 1300.0;
    float seas = smoothstep(0.55, 0.0, length(q - vec2(-6.0, 5.0)) / 14.0) * 0.12 + smoothstep(0.55, 0.0, length(q - vec2(7.0, -4.0)) / 10.0) * 0.1;
    vec3 moon = uMoonCol * (1.0 - seas);
    float a = clamp(haze + disc + halo, 0.0, 1.0);
    vec3 col = (horizon(dir) * haze * (1.0 - disc) + moon * disc + uMoonCol * halo * (1.0 - disc)) / max(a, 1e-3);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;
function Sky() {
  const { geo, material } = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, transparent: true, depthWrite: false, side: THREE.BackSide,
      uniforms: { uMoonDir: { value: moonDir }, uMoonCol: { value: new THREE.Color(SKY.moon) }, uHaze: { value: new THREE.Color(SKY.haze) } },
    });
    return { geo: new THREE.CylinderGeometry(900, 900, 700, 96, 1, true).translate(0, 330, 0), material };
  }, []);
  return <mesh geometry={geo} material={material} frustumCulled={false} renderOrder={-1} />;
}

/* ---------- The landmarks, each on its pad with a glowing rim, and the inner zones ---------- */

// A spot on the island in game metres, turned so its local +z (its front door) faces the plaza.
function Spot({ x, z, y = GROUND, children }: { x: number; z: number; y?: number; children: ReactNode }) {
  return <group position={[x * S, y, z * S]} rotation={[0, Math.atan2(-x, -z), 0]}>{children}</group>;
}

function Landmarks({ L, still, anchors }: { L: TownLayout; still: boolean; anchors: RefObject<(THREE.Object3D | null)[]> }) {
  const rim = useMemo(() => new THREE.RingGeometry(0.6, 0.64, 48).rotateX(-Math.PI / 2), []);
  return <group>
    {LANDMARK_SET.map((b, i) => {
      const z = L.zones[i], dock = i === 3;
      return <Spot key={i} x={z.x} z={z.z}>
        {!dock && <>
          <Part geo={G.disc} color={C.brick} p={[0, 0.003, 0.08]} s={[0.42, 0.006, 0.42]} />
          <mesh geometry={rim} material={mat(b.rim, { glow: 1.6 })} position={[0, 0.006, 0.08]} scale={0.7} />
        </>}
        <group scale={LANDMARK_XYZ}>{b.el(still)}</group>
        <object3D ref={o => { anchors.current[i] = o; }} position={[0, (b.h * LANDMARK_XYZ[1]) / 2, 0]} />
      </Spot>;
    })}
    {L.zones.slice(8).map(z => <Spot key={z.id} x={z.x} z={z.z}>
      <Part geo={G.disc} color={C.brick} p={[0, 0.003, 0.12]} s={[0.3, 0.006, 0.3]} />
      <mesh geometry={rim} material={mat(INNER_RIM[z.id], { glow: 1.6 })} position={[0, 0.006, 0.12]} scale={0.49} />
      <group scale={TOWN_XYZ} position={[0, 0, -0.06]}><InnerZone id={z.id} /></group>
    </Spot>)}
    {EXTRA_HOUSES.map(h => <Spot key={h.x} x={h.x} z={h.z}><group scale={TOWN_XYZ}><House roof={h.roof} /></group></Spot>)}
  </group>;
}

/* ---------- Fireflies: warm motes drifting low over the meadows ---------- */

// About ninety soft points over the land (never the water), each on its own slow loop and its own
// blink, drawn additively so they read as little lights in the night, not as particles. One draw
// call; the drift is in the vertex shader, so the CPU only bumps one uniform. Still: they hold.
const FLY_VERT = /* glsl */ `
  uniform float uTime, uScale;
  attribute float aSeed;
  varying float vA;
  void main() {
    float t = uTime * (0.35 + aSeed * 0.3) + aSeed * 40.0;
    vec3 p = position + vec3(sin(t) * 0.09, sin(t * 1.7 + aSeed * 9.0) * 0.035, cos(t * 0.8) * 0.09);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vA = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(uTime * (0.9 + aSeed) + aSeed * 23.0), 3.0);
    gl_PointSize = uScale * (0.7 + aSeed * 0.6) / -mv.z;
  }
`;
const FLY_FRAG = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = (smoothstep(1.0, 0.0, d) * 0.55 + smoothstep(0.32, 0.0, d)) * vA;
    gl_FragColor = vec4(vec3(1.0, 0.86, 0.5) * a, a);
  }
`;
function Fireflies({ L, still }: { L: TownLayout; still: boolean }) {
  const { geo, material } = useMemo(() => {
    const rnd = seeded(7), pos: number[] = [], seed: number[] = [];
    for (let tries = 0; tries < 4000 && seed.length < 90; tries++) {
      const x = (rnd() * 2 - 1) * 165, z = (rnd() * 2 - 1) * 165, sd = L.sdAt(x, z);
      if (sd > -6 || Math.hypot(x, z) < 16) continue;
      pos.push(x * S, GROUND + 0.05 + rnd() * 0.22, z * S); seed.push(rnd());
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: FLY_VERT, fragmentShader: FLY_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 3 }, uScale: { value: 100 } },
    });
    return { geo, material };
  }, [L]);
  const ref = useRef<THREE.Points>(null);
  useFrame((state, dt) => {
    const u = (ref.current?.material as THREE.ShaderMaterial | undefined)?.uniforms;
    if (!u) return;
    // about 8 px across at the island's distance on a desktop, a little less on a phone
    u.uScale.value = Math.min(state.size.width, state.size.height * 1.6) * 0.1;
    if (!still) u.uTime.value += dt;
  });
  return <points ref={ref} geometry={geo} material={material} frustumCulled={false} renderOrder={2} />;
}

/* ---------- Marks: each landmark's screen box, written to the stage's buttons ---------- */

// The stage (island-stage.tsx) draws one button per landmark over the scene, outside the island's
// link, so a building can be clicked, hovered or tabbed to for its name. Every frame this places
// each button on its building: the centre projected to the canvas, the size from its distance.
export type MarkEls = RefObject<(HTMLElement | null)[]>;
function Marks({ anchors, marks }: { anchors: RefObject<(THREE.Object3D | null)[]>; marks?: MarkEls }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  const last = useRef<string[]>([]);
  useFrame(({ camera, size }) => {
    if (!marks) return;
    const cam = camera as THREE.PerspectiveCamera;
    cam.updateMatrixWorld();
    const fullH = cam.view?.fullHeight ?? size.height;
    const f = fullH / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    anchors.current.forEach((a, i) => {
      const el = marks.current[i];
      if (!a || !el) return;
      a.updateWorldMatrix(true, false);
      v.setFromMatrixPosition(a.matrixWorld);
      const depth = -v.clone().applyMatrix4(cam.matrixWorldInverse).z;
      v.project(cam);
      const x = Math.round((v.x + 1) / 2 * size.width), y = Math.round((1 - v.y) / 2 * size.height);
      // the building's box, but never under 32 px, so a small building is still easy to hit
      const k = f / Math.max(depth, 0.1), w = Math.max(32, Math.round(1.2 * LANDMARK_SCALE * k)), h = Math.max(32, Math.round((LANDMARK_SET[i].h + 0.25) * LANDMARK_XYZ[1] * k));
      const key = `${x},${y},${w},${h}`;
      if (last.current[i] === key) return;
      last.current[i] = key;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
    });
  });
  return null;
}

// Every mesh on the island casts and takes the moon's shadow (the ocean and the sky are outside).
function Shadows({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }, []);
  return <group ref={ref}>{children}</group>;
}

/* ---------- Framing: the island in the stage box, the horizon level behind it ---------- */

// The stage box, in canvas pixels (the canvas covers the whole section).
export type Focus = { x: number; y: number; w: number; h: number };

// The camera looks dead level, so the horizon is a straight line through the lens's centre row;
// a view offset (a shifted lens) puts that centre where it is needed instead of the middle of the
// canvas. Then: the hero landmark's screen width sets its distance, the viewing angle sets the
// camera height, and the horizon lands that angle above the hero, about a fifth of the way down
// on desktop. The moon hangs low over the sea just left of the island's
// back, so its glitter path runs down the water straight at the island and the island stands
// against it (the ocean bar: the subject in the middle distance on the glint road), while the
// words to the left sit on calm dark water.
// Motion (never with `still`): none of its own. A drag turns the camera round the island, up to
// about 40 degrees either way, about the vertical only, so the horizon stays level.
// Scene r4 (Bruno's bar): a low, close camera on one landmark instead of a high overview. A long
// lens (about 44 degrees tall on desktop) a couple of island units from the Schoolhouse, which
// stands large in the lower right third; grass, trees and lamps run off the bottom and right
// edges, the rest of the island recedes behind it and the moonlit sea closes the view at a
// horizon about a fifth of the way down, so almost no empty sky is left.
// Andrew 2026-11-04 ("zoom out a lot more lol"): back to the whole island in the ocean. The pivot
// is the island's middle and the 'hero' is the whole island, about 14 units across.
// Andrew 2026-11-04: closer and lower, "the end is almost at the waterline" while the whole island
// still shows, filling most of the right side.
const VIEW_ANGLE = deg(11);
const HERO_W = 14; // the island's width in island units (about 400 m at 28.8 m a unit)
const HUB: [number, number] = [0, 0.4]; // x, z in island units: the island's middle
const HUB_Y = 0;
function Framing({ focus, still }: { focus: Focus | null; still: boolean }) {
  const { camera, size, invalidate, gl } = useThree();
  const base = useRef(new THREE.Vector3());
  const section = useRef<HTMLElement | null>(null);
  // Click and drag to turn round the island, within reason (Andrew 2026-11-04): yaw only, clamped.
  const yaw = useRef({ v: 0, target: 0 });
  // Design review, round 2 (components/review): the closer framing while <html> carries rvf-island.
  // The review panel fires rv:flags when a switch flips. Remove with the review folder.
  const [close, setClose] = useState(() => document.documentElement.classList.contains('rvf-island'));
  useEffect(() => {
    const read = () => setClose(document.documentElement.classList.contains('rvf-island'));
    window.addEventListener('rv:flags', read);
    return () => window.removeEventListener('rv:flags', read);
  }, []);
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const W = size.width, H = size.height;
    if (!W || !H) return;
    const box = focus ?? { x: W * 0.1, y: H * 0.25, w: W * 0.8, h: H * 0.6 };
    const wide = W >= 860;
    // focal length in pixels: a long lens on desktop; on a phone bounded by the width, so the
    // narrow screen still holds the hero and a little of the town round it
    const f = wide ? Math.min(H * 1.1, W * 0.8) : Math.min(H * 0.8, W * 1.4);
    // the hero's screen width, so its distance: about a sixth of a desktop, under a third of a phone
    const heroPx = (wide ? Math.min(W * 0.72, H * 1.3) : W * 0.95) * (close ? 1.4 : 1);
    const D = (f * HERO_W) / heroPx;
    const angle = wide ? VIEW_ANGLE : deg(18);
    const px = wide ? W * 0.64 : W * 0.5; // the island's column: the right side on desktop
    const ty = wide ? Math.max(H * 0.6, box.y + box.h * 0.58) : box.y + box.h * 0.7; // the island's row
    const py = ty - f * Math.tan(angle); // the horizon row
    const fullW = 2 * Math.max(px, W - px), fullH = 2 * Math.max(py, H - py);
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(fullH / 2 / f));
    cam.aspect = fullW / fullH;
    cam.near = 0.05; cam.far = 1400;
    cam.setViewOffset(fullW, fullH, fullW / 2 - px, fullH / 2 - py, W, H);
    cam.updateProjectionMatrix();
    const h = HUB_Y + D * Math.sin(angle);
    base.current.set(HUB[0], h, HUB[1] + D * Math.cos(angle));
    { // keep any turn the visitor has dragged in
      const v = yaw.current.v, c = Math.cos(v), sn = Math.sin(v), oz = base.current.z - HUB[1];
      cam.position.set(HUB[0] + oz * sn, h, HUB[1] + oz * c);
      cam.rotation.set(0, v, 0);
    }
    // The moon, placed by where it should appear on screen: just left of the island's centre on
    // desktop, so its path runs down to the island; on a phone, where the words fill the sky above
    // the horizon, low on the right.
    const mx = wide ? px - 0.2 * box.w : W * 0.76, my = py - f * Math.tan(deg(wide ? 1.7 : 3.4)); // the long desktop lens (r4): lower, so it clears the header
    moonDir.set((mx - px) / f, (py - my) / f, -1).normalize();
    invalidate();
  }, [camera, size, focus, invalidate, close]);
  useEffect(() => {
    section.current = gl.domElement.closest('section');
    if (still) return;
    // Drag: anywhere on the section, the island (the door link) included, turns the camera round the
    // island; a click that never moved still opens the door (island-door.tsx reads data-dragged).
    // No pointer sway, no drift and no glide in (Andrew 2026-11-04: "don't make it move with the mouse
    // hover", "you almost have to chase it"): only a drag moves it.
    const sec = section.current;
    let drag: { x: number; start: number; id: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as Element).closest('button, input, textarea, label, a:not(.il-door)')) return;
      drag = { x: e.clientX, start: yaw.current.target, id: e.pointerId };
      sec?.removeAttribute('data-dragged');
    };
    const onDrag = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (Math.abs(e.clientX - drag.x) > 6) { sec?.setAttribute('data-dragging', ''); sec?.setAttribute('data-dragged', ''); }
      yaw.current.target = THREE.MathUtils.clamp(drag.start - (e.clientX - drag.x) * 0.004, -0.7, 0.7);
    };
    const onUp = () => { drag = null; sec?.removeAttribute('data-dragging'); };
    sec?.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onDrag, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      sec?.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onDrag);
      window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
    };
  }, [still, gl]);
  useFrame((state, delta) => {
    if (still) return;
    const yw = yaw.current, b = base.current;
    if (Math.abs(yw.target - yw.v) < 1e-4) return; // at rest: the camera stays where Framing put it
    yw.v += (yw.target - yw.v) * (1 - Math.exp(-Math.min(delta, 0.05) * 6));
    const ox = b.x - HUB[0], oz = b.z - HUB[1], c = Math.cos(yw.v), sn = Math.sin(yw.v);
    state.camera.position.set(HUB[0] + ox * c + oz * sn, b.y, HUB[1] - ox * sn + oz * c);
    state.camera.rotation.set(0, yw.v, 0);
  });
  return null;
}

// The moonlight on the island: one directional light in the moon's colour, on the moon's own
// bearing (moonDir, which Framing sets for the layout), so the lit side of every roof, wall and
// crown is the side toward the moon in the sky and the shadows fall away from it, toward the
// viewer. The real moon sits a couple of degrees over the horizon, which would leave a flat island
// dark, so the light keeps the bearing and is lifted to KEY_ELEV. The same 1024 shadow map as
// before; its box is now fitted to the island as the light sees it (wide and shallow), so it is a
// little sharper for nothing. Set every frame before the draw, so `still` gets it too.
function MoonLight() {
  const ref = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const l = ref.current;
    if (!l) return;
    const k = Math.cos(KEY_ELEV) / (Math.hypot(moonDir.x, moonDir.z) || 1);
    keyDir.set(moonDir.x * k, Math.sin(KEY_ELEV), moonDir.z * k);
    l.position.copy(keyDir).multiplyScalar(16);
  });
  return <directionalLight
    ref={ref} color={SKY.moon} intensity={1.15} position={[-2.6, 9, -13]} castShadow
    shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.015}
    shadow-camera-left={-6.8} shadow-camera-right={6.8} shadow-camera-top={4.8} shadow-camera-bottom={-4.8}
    shadow-camera-near={6} shadow-camera-far={27}
  />;
}

// Tells the stage when the first frame is on screen, so it can fade the canvas in.
function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => { if (!done.current) { done.current = true; requestAnimationFrame(onReady); } });
  return null;
}

// No clouds (Andrew 2026-11-11: the low-poly puffs read as unrealistic beside the water and the
// moon, "remove the island cloud unless you can make realistic clouds"). Removed, not restyled.

function Town({ still }: { still: boolean }) {
  const L = getLayout();
  return <>
    <Ocean still={still} L={L} />
    <Shadows>
      <Land L={L} />
      <Nature L={L} />
      <Car still={still} L={L} />
    </Shadows>
    <Tufts L={L} />
    <Lanterns L={L} />
    <Fireflies L={L} still={still} />
  </>;
}

export default function IslandScene({ still, paused, focus, onReady, marks }: {
  still: boolean; paused: boolean; focus: Focus | null; onReady: () => void; marks?: MarkEls;
}) {
  const anchors = useRef<(THREE.Object3D | null)[]>([]);
  return (
    <Canvas
      flat
      shadows
      dpr={[1, 1.25]}
      frameloop={still ? 'demand' : paused ? 'never' : 'always'}
      camera={{ manual: true, fov: 40, near: 0.3, far: 1400, position: [0, 4, 18], rotation: [0, 0, 0] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden="true"
    >
      <Framing focus={focus} still={still} />
      <FirstFrame onReady={onReady} />
      {/* Night: the moon lights the island from its own side of the sky and casts the shadows
          (MoonLight); a soft berry sky fills the sides turned away from it; a faint warm light from
          the viewer's side stands in for the town's lamps on the fronts. */}
      {/* Turned down to a night (Andrew 2026-11-11: too bright "with the moon that low ... you should
          be making the night time view"): the moon was 2.7 and the sky fill 1.05 and 0.3, which lit
          the town like an overcast afternoon. Now the moon only picks out the sides that face it,
          the fill is a dim deep blue, and the windows and lamps are what glow. */}
      <hemisphereLight args={['#6f7fd0', '#141a45', 0.42]} />
      <ambientLight color="#3a4aa8" intensity={0.16} />
      <MoonLight />
      <directionalLight color={C.peach} intensity={0.14} position={[5, 3.5, 9]} />
      <pointLight color={C.peach} intensity={0.5} distance={1.4} decay={1.6} position={[0, GROUND + 0.5, 0]} />
      <Sky />
      {/* seen from the south, as the game's overview is: the lake at top centre, the dock bottom right */}
      <group>
        <Town still={still} />
        <Shadows>
          <Landmarks L={getLayout()} still={still} anchors={anchors} />
        </Shadows>
      </group>
      <Marks anchors={anchors} marks={marks} />
    </Canvas>
  );
}
