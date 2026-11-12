// File: HeroGlobe.tsx
// Path: src/features/landing/HeroGlobe.tsx
//
// The landing page's 3D hero (three.js via @react-three/fiber): a globe of
// dots turned towards India, glowing business cities and arcs between them.
// Decorative only — the landing page is public, so no client data is used.
// Holds still for "reduce motion"; renders nothing without WebGL.

'use client';

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const R = 1;
const DEG = Math.PI / 180;

const CITIES: [number, number][] = [
  [19.08, 72.88], // Mumbai
  [28.61, 77.21], // Delhi
  [12.97, 77.59], // Bengaluru
  [13.08, 80.27], // Chennai
  [22.57, 88.36], // Kolkata
  [17.39, 78.49], // Hyderabad
  [18.52, 73.86], // Pune
  [23.02, 72.57], // Ahmedabad
  [26.91, 75.79], // Jaipur
  [21.17, 72.83], // Surat
  [26.85, 80.95], // Lucknow
  [9.93, 76.27], // Kochi
  [20.3, 85.82], // Bhubaneswar
  [30.73, 76.78], // Chandigarh
  [26.14, 91.74], // Guwahati
];
const ARCS: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 4],
  [2, 3],
  [5, 0],
  [6, 2],
  [7, 1],
  [3, 4],
  [8, 5],
  [11, 2],
  [12, 4],
  [13, 1],
  [14, 4],
  [9, 6],
];

// round dots (three draws square points by default)
let dotTexture: THREE.Texture | null = null;
const roundDot = () => {
  if (dotTexture) return dotTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(32, 32, 32, 0, Math.PI * 2);
  g.fill();
  dotTexture = new THREE.CanvasTexture(c);
  return dotTexture;
};

const toVec = (lat: number, lng: number, r = R) => {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
};

// India faces the camera: turn by π/2 − θ around y, tilt by the latitude around x
const FACE_Y = Math.PI / 2 - (78 + 180) * DEG;
const FACE_X = 21 * DEG;

function Dots() {
  const geometry = useMemo(() => {
    const n = 2600;
    const pos = new Float32Array(n * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const t = golden * i;
      pos.set([Math.cos(t) * rad * R, y * R, Math.sin(t) * rad * R], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.018}
        color="#6366f1"
        map={roundDot()}
        alphaTest={0.05}
        transparent
        opacity={0.6}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function Cities() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints(CITIES.map(([la, lo]) => toVec(la, lo, R * 1.005)));
    return g;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.07}
        color="#a78bfa"
        map={roundDot()}
        alphaTest={0.05}
        transparent
        opacity={0.95}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function Arc({ from, to, offset }: { from: THREE.Vector3; to: THREE.Vector3; offset: number }) {
  const line = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.setLength(R + from.distanceTo(to) * 0.55);
    const g = new THREE.BufferGeometry().setFromPoints(
      new THREE.QuadraticBezierCurve3(from, mid, to).getPoints(48)
    );
    return new THREE.Line(
      g,
      new THREE.LineBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.6 })
    );
  }, [from, to]);
  // each arc glows in turn
  const ref = useRef<THREE.Line>(null);
  useFrame(({ clock }) => {
    const m = ref.current?.material as THREE.LineBasicMaterial | undefined;
    if (m) m.opacity = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 1.2 + offset));
  });
  return <primitive ref={ref} object={line} />;
}

function Globe({ still }: { still: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const cities = useMemo(() => CITIES.map(([la, lo]) => toVec(la, lo, R * 1.005)), []);
  useFrame(({ clock }) => {
    if (spin.current && !still)
      spin.current.rotation.y = FACE_Y + Math.sin(clock.elapsedTime * 0.12) * 0.5;
  });
  return (
    <group rotation={[FACE_X, 0, 0]}>
      <group ref={spin} rotation={[0, FACE_Y, 0]}>
        <mesh>
          <sphereGeometry args={[R * 0.985, 48, 48]} />
          <meshBasicMaterial color="#4f46e5" transparent opacity={0.06} />
        </mesh>
        <Dots />
        <Cities />
        {ARCS.map(([a, b], i) => (
          <Arc key={i} from={cities[a]!} to={cities[b]!} offset={i * 0.9} />
        ))}
      </group>
    </group>
  );
}

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};

export default function HeroGlobe() {
  const [ok] = useState(hasWebGL);
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!ok) return null;
  return (
    <Canvas
      camera={{ position: [0, 0, 2.6], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      frameloop={still ? 'demand' : 'always'}
      aria-hidden
    >
      <Globe still={still} />
    </Canvas>
  );
}
