'use client';
import { Box, Cyl, Sphere } from '../parts';
import { Prop } from '../Prop';

// Experience lives here. A chair, a lamp, a cabinet, and on the back wall a small
// cross and a figurine on a shelf. Both get a caption in the same voice as everything
// else; neither gets a speech. The figurine is a stand-in until the real one is scanned.

export function Clinic({ x }: { x: number }) {
  return <group position={[x, 0, 0]}>
    <Prop fixed position={[0, 0, 0]}>
      <Cyl r={4.4} top={4.2} h={0.4} color="#b9c8d2" position={[0, -0.2, 0]} segments={48} />
      <Box size={[6, 3.2, 0.2]} color="#e8eef2" position={[0, 1.6, -2.6]} />
      <Cyl r={0.7} top={0.5} h={0.5} color="#9aa7b1" position={[-0.4, 0.25, 0.2]} segments={20} />
      <Box size={[0.7, 0.18, 1.6]} color="#6b8ca3" position={[-0.4, 0.75, 0.4]} rotation={[0.12, 0, 0]} />
      <Box size={[0.7, 0.18, 1.0]} color="#6b8ca3" position={[-0.4, 1.15, -0.65]} rotation={[-0.9, 0, 0]} />
      <Cyl r={0.05} h={1.8} color="#d0d6da" position={[1.0, 1.3, -0.4]} segments={8} />
      <Box size={[0.5, 0.12, 0.3]} color="#f7f2e8" position={[1.0, 2.25, -0.4]} />
      <Box size={[1.2, 0.9, 0.5]} color="#f7f2e8" position={[2.0, 0.45, -2.2]} />
      <Box size={[1.4, 0.06, 0.35]} color="#b98a5a" position={[-1.7, 1.55, -2.35]} />
    </Prop>

    <Prop fixed position={[0.9, 2.15, -2.48]} label="A small cross. Faith, quietly.">
      <Box size={[0.08, 0.62, 0.05]} color="#8a6440" />
      <Box size={[0.4, 0.08, 0.05]} color="#8a6440" position={[0, 0.14, 0]} />
    </Prop>

    <Prop position={[-1.7, 1.8, -2.35]} label="From the office shelf. The real one gets scanned." colliders="hull">
      <Cyl r={0.16} h={0.04} color="#d9a56b" position={[0, -0.2, 0]} segments={16} />
      <Cyl r={0.14} top={0.11} h={0.34} color="#f7f2e8" position={[0, -0.03, 0]} segments={12} />
      <Box size={[0.3, 0.05, 0.05]} color="#f7f2e8" position={[0, 0.1, 0]} />
      <Sphere r={0.09} color="#e2b77f" position={[0, 0.22, 0]} />
    </Prop>

    <Prop position={[2.0, 1.05, -2.15]} label="Mirror and explorer. The two tools that matter." voice="clank">
      <Box size={[0.5, 0.03, 0.04]} color="#c9c2b8" position={[-0.1, 0, 0]} />
      <Cyl r={0.06} h={0.02} color="#dfe6ea" position={[0.2, 0, 0]} rotation={[Math.PI / 2, 0, 0]} segments={12} />
    </Prop>
  </group>;
}
