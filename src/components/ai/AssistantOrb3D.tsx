// File: AssistantOrb3D.tsx
// Path: src/components/ai/AssistantOrb3D.tsx
//
// The assistant's 3D "presence" (three.js via @react-three/fiber): a sphere of
// glowing orange particles with a hot core and orbiting rings, on a transparent
// canvas so it floats over the page. The mood changes speed, size and glow:
//   listening calm · hearing brighter · thinking fast spin · speaking pulse · muted grey.

'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type OrbMood = 'listening' | 'hearing' | 'thinking' | 'speaking' | 'muted';

const COUNT = 2600;
// stable scatter (same every render)
const noise = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const glowTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.25, 'rgba(255,170,60,0.75)');
  grad.addColorStop(0.6, 'rgba(255,110,20,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
};

const dotTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
};

function Orb({ mood }: { mood: OrbMood }) {
  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Points>(null);
  const core = useRef<THREE.Sprite>(null);
  const rings = useRef<THREE.Group>(null);
  const mat = useRef<THREE.PointsMaterial>(null);

  const { positions, dot, glow } = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // a shell with depth + some loose sparks outside it
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      const rad = i % 9 === 0 ? 1.15 + noise(i) * 0.35 : 0.92 + noise(i + 7) * 0.12;
      p[i * 3] = Math.cos(th) * r * rad;
      p[i * 3 + 1] = y * rad;
      p[i * 3 + 2] = Math.sin(th) * r * rad;
    }
    return { positions: p, dot: dotTexture(), glow: glowTexture() };
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const fast = mood === 'thinking' ? 2.4 : mood === 'hearing' ? 0.9 : mood === 'muted' ? 0.05 : 0.35;
    if (shell.current) {
      shell.current.rotation.y += dt * fast * 0.6;
      shell.current.rotation.x = Math.sin(t * 0.2) * 0.25;
    }
    if (rings.current) {
      rings.current.children.forEach((ring, i) => {
        ring.rotation.z += dt * fast * (i % 2 ? -0.8 : 1.1);
      });
    }
    const pulse = mood === 'speaking' ? 1 + Math.sin(t * 9) * 0.07 : mood === 'hearing' ? 1 + Math.sin(t * 4) * 0.03 : 1;
    group.current?.scale.setScalar(pulse);
    const muted = mood === 'muted';
    if (mat.current) {
      mat.current.color.set(muted ? '#8a8a96' : '#ff8a1f');
      mat.current.opacity = muted ? 0.35 : mood === 'thinking' ? 1 : 0.85;
    }
    if (core.current) {
      const s = (muted ? 0.9 : mood === 'thinking' ? 1.7 + Math.sin(t * 6) * 0.15 : 1.35) * pulse;
      core.current.scale.set(s, s, 1);
      (core.current.material as THREE.SpriteMaterial).opacity = muted ? 0.25 : 0.95;
    }
  });

  return (
    <group ref={group}>
      <points ref={shell}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={mat}
          map={dot}
          size={0.085}
          sizeAttenuation
          transparent
          depthWrite={false}
          color="#ff8a1f"
        />
      </points>
      <sprite ref={core}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <group ref={rings}>
        {[
          [1.3, 0.4, 0.2],
          [1.45, -0.9, 0.6],
          [1.18, 1.25, -0.3],
        ].map(([r, rx, ry], i) => (
          <mesh key={i} rotation={[rx!, ry!, 0]}>
            <torusGeometry args={[r!, 0.009, 6, 160]} />
            <meshBasicMaterial color="#ff9a2e" transparent opacity={0.75} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* halo */}
      <sprite scale={[4.2, 4.2, 1]}>
        <spriteMaterial map={glow} transparent opacity={mood === 'muted' ? 0.08 : 0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

export function AssistantOrb3D({ mood, size = 220 }: { mood: OrbMood; size?: number }) {
  return (
    <div style={{ width: size, height: size }} aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 50 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <Orb mood={mood} />
      </Canvas>
    </div>
  );
}
