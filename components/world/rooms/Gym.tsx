'use client';
import { Box, Cyl, Sphere, Ring } from '../parts';
import { Prop } from '../Prop';

// Contact lives here. A rack, a bar, a kettlebell, two dumbbells. Everything iron clanks.

function Dumbbell({ position }: { position: [number, number, number] }) {
  return <Prop position={position} rotation={[0, 0, 0]} voice="clank" label="Warm-up pair.">
    <Cyl r={0.03} h={0.5} color="#c9c2b8" rotation={[Math.PI / 2, 0, 0]} segments={8} />
    <Cyl r={0.12} h={0.1} color="#2a2624" position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]} segments={16} />
    <Cyl r={0.12} h={0.1} color="#2a2624" position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} segments={16} />
  </Prop>;
}

export function Gym({ x }: { x: number }) {
  return <group position={[x, 0, 0]}>
    <Prop fixed position={[0, 0, 0]}>
      <Cyl r={4.4} top={4.2} h={0.4} color="#3a3531" position={[0, -0.2, 0]} segments={48} />
      <Box size={[3.2, 0.06, 2.2]} color="#4a4440" position={[0, 0.03, 0.4]} />
      <Box size={[0.12, 2.2, 0.12]} color="#2a2624" position={[-1.3, 1.1, -1.4]} />
      <Box size={[0.12, 2.2, 0.12]} color="#2a2624" position={[1.3, 1.1, -1.4]} />
      <Box size={[2.8, 0.1, 0.12]} color="#2a2624" position={[0, 2.2, -1.4]} />
      <Box size={[0.3, 0.06, 0.3]} color="#2a2624" position={[-1.3, 1.0, -1.35]} />
      <Box size={[0.3, 0.06, 0.3]} color="#2a2624" position={[1.3, 1.0, -1.35]} />
    </Prop>

    <Prop position={[0, 1.15, -1.35]} voice="clank" label="5 a.m., most days. The plates clank.">
      <Cyl r={0.035} h={3.0} color="#c9c2b8" rotation={[0, 0, Math.PI / 2]} segments={10} />
      {[-1.15, -1.05, 1.05, 1.15].map(px => (
        <Cyl key={px} r={0.3} h={0.08} color="#b5603a" position={[px, 0, 0]} rotation={[0, 0, Math.PI / 2]} segments={24} />
      ))}
    </Prop>

    <Prop position={[1.4, 0.5, 0.9]} colliders="hull" voice="clank" label="Kettlebell. Also a paperweight.">
      <Sphere r={0.3} color="#2a2624" />
      <Ring r={0.2} tube={0.05} color="#2a2624" position={[0, 0.4, 0]} />
    </Prop>

    <Dumbbell position={[-1.5, 0.3, 0.7]} />
    <Dumbbell position={[-1.1, 0.3, 0.7]} />
  </group>;
}
