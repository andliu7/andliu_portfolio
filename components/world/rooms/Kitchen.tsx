'use client';
import { Box, Cyl, Sphere } from '../parts';
import { Prop } from '../Prop';

// About lives here. A counter, a pot, a board, a bowl of tomatoes.

export function Kitchen({ x }: { x: number }) {
  return <group position={[x, 0, 0]}>
    <Prop fixed position={[0, 0, 0]}>
      <Cyl r={4.4} top={4.2} h={0.4} color="#d9a56b" position={[0, -0.2, 0]} segments={48} />
      <Box size={[3.4, 1.0, 1.4]} color="#f1e7d6" position={[0, 0.5, -0.6]} />
      <Box size={[3.6, 0.1, 1.6]} color="#8a6440" position={[0, 1.05, -0.6]} />
      <Box size={[0.4, 1.6, 1.4]} color="#f1e7d6" position={[2.1, 0.8, -0.6]} />
      <Box size={[1.2, 0.9, 0.5]} color="#7f9f69" position={[-1.6, 1.55, -1.9]} />
      <Cyl r={0.12} h={0.9} color="#6d8a4f" position={[-1.9, 1.4, -1.6]} segments={8} />
      <Sphere r={0.3} color="#557a3a" position={[-1.9, 1.95, -1.6]} />
      <Box size={[0.9, 0.05, 0.6]} color="#b98a5a" position={[0.7, 1.13, -0.5]} />
    </Prop>

    <Prop position={[-0.9, 1.4, -0.6]} label="Sunday sauce. Give it a nudge." colliders="hull">
      <Cyl r={0.45} top={0.5} h={0.55} color="#3a3531" position={[0, 0, 0]} />
      <Cyl r={0.52} h={0.06} color="#55504b" position={[0, 0.31, 0]} />
      <Sphere r={0.08} color="#3a3531" position={[0, 0.38, 0]} />
    </Prop>

    <Prop position={[0.85, 1.2, -0.35]} rotation={[0, -0.4, 0]} label="The good knife. Sharpened Sundays too." voice="clank">
      <Box size={[0.55, 0.02, 0.09]} color="#d8d8d8" position={[-0.15, 0, 0]} />
      <Box size={[0.25, 0.05, 0.09]} color="#3a3531" position={[0.25, 0, 0]} />
    </Prop>

    <Prop position={[-0.1, 1.25, -0.2]} label="Tomatoes from the planter, on a good year." colliders="hull">
      <Cyl r={0.3} top={0.38} h={0.22} color="#f7f2e8" position={[0, 0, 0]} />
    </Prop>
    {([[-0.3, 0.05], [-0.05, -0.05], [-0.15, 0.12]] as const).map(([px, pz]) => (
      <Prop key={`${px},${pz}`} position={[px, 1.6, -0.2 + pz]} colliders="ball">
        <Sphere r={0.11} color="#c94a3a" />
      </Prop>
    ))}
  </group>;
}
