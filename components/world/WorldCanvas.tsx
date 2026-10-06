'use client';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Garden } from './rooms/Garden';
import { Kitchen } from './rooms/Kitchen';
import { Clinic } from './rooms/Clinic';
import { Gym } from './rooms/Gym';
import { ScrollCamera, ROOM_GAP } from './ScrollCamera';
import { CaptionContext, type Caption } from './Prop';

// The one Canvas. Four rooms along the x axis, one physics world, one scroll camera.
// This file is loaded lazily by World.tsx so three.js and the physics engine never
// reach a phone or a reduced-motion visitor.

export default function WorldCanvas({ onCaption }: { onCaption: (c: Caption) => void }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      camera={{ fov: 34, near: 0.1, far: 100, position: [-9.5, 6.5, 15.5] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <fog attach="fog" args={['#d8cfbd', 16, 40]} />
      <hemisphereLight args={['#fff3e0', '#8a7a5a', 1.1]} />
      <directionalLight
        position={[6, 12, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0008}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <CaptionContext.Provider value={onCaption}>
        <Physics>
          <Garden x={0} />
          <Kitchen x={ROOM_GAP * 1} />
          <Clinic x={ROOM_GAP * 2} />
          <Gym x={ROOM_GAP * 3} />
        </Physics>
      </CaptionContext.Provider>
      <ScrollCamera />
    </Canvas>
  );
}
