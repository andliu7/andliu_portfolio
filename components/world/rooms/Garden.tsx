'use client';
import { Box, Cyl, Sphere, Blob } from '../parts';
import { Prop } from '../Prop';

// Work lives here. Terraced beds are the landscape-architecture nod: planned, stepped,
// planted over time. Static parts sit in one fixed body; the things you can flick are Props.

function Tree({ x, z, h, color }: { x: number; z: number; h: number; color: string }) {
  return <>
    <Cyl r={0.13} top={0.09} h={h} color="#6b4a33" position={[x, h / 2 + 0.1, z]} segments={10} />
    <Blob r={0.55 + h * 0.15} color={color} position={[x, h + 0.45, z]} />
  </>;
}

export function Garden({ x }: { x: number }) {
  return <group position={[x, 0, 0]}>
    <Prop fixed position={[0, 0, 0]}>
      <Cyl r={4.4} top={4.2} h={0.4} color="#8a7a5a" position={[0, -0.2, 0]} segments={48} />
      <Cyl r={3.9} h={0.12} color="#5f7d47" position={[0, 0.06, 0]} segments={48} />
      <Box size={[3.2, 0.5, 1.2]} color="#6d8a4f" position={[-1.2, 0.35, -1.4]} />
      <Box size={[2.4, 0.5, 1.0]} color="#77955a" position={[-0.9, 0.85, -1.6]} />
      <Box size={[1.6, 0.5, 0.8]} color="#86a466" position={[-0.6, 1.35, -1.8]} />
      <Box size={[0.9, 0.06, 6.0]} color="#d9c9a8" position={[1.2, 0.14, 0]} rotation={[0, 0.18, 0]} />
      <Tree x={-2.6} z={1.6} h={1.4} color="#4f6b3b" />
      <Tree x={2.9} z={-1.8} h={1.9} color="#5c7a45" />
      <Tree x={2.4} z={1.9} h={1.1} color="#6d8a4f" />
    </Prop>

    <Prop position={[-0.2, 0.6, 0.6]} label="The garden table. The projects live here.">
      <Box size={[1.5, 0.08, 0.45]} color="#b98a5a" position={[0, 0.55, 0]} />
      <Box size={[0.08, 0.5, 0.4]} color="#8a6440" position={[-0.65, 0.28, 0]} />
      <Box size={[0.08, 0.5, 0.4]} color="#8a6440" position={[0.65, 0.28, 0]} />
      <Box size={[1.5, 0.5, 0.06]} color="#b98a5a" position={[0, 0.9, -0.22]} />
    </Prop>

    {([[-0.6, 1.9], [0.2, 2.5], [-1.6, 2.3]] as const).map(([px, pz]) => (
      <Prop key={`${px},${pz}`} position={[px, 0.5, pz]} colliders="ball" label="Boxwood. Needs clipping.">
        <Sphere r={0.32} color="#557a3a" squash={0.8} />
      </Prop>
    ))}

    <Prop position={[2.2, 0.6, 0.9]} colliders="hull" label="A planter. Tomatoes, if the squirrels allow.">
      <Cyl r={0.22} top={0.28} h={0.4} color="#b5603a" position={[0, 0, 0]} segments={14} />
      <Sphere r={0.3} color="#6d8a4f" position={[0, 0.4, 0]} />
    </Prop>
  </group>;
}
