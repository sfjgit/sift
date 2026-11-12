// File: JarvisSphere.tsx
// Path: src/components/ai/JarvisSphere.tsx
//
// The voice assistant's "it's alive" visual: a glowing orange particle globe with
// orbiting rings, drawn on a <canvas> (no images, no libraries). The mood changes
// with the state — calm while listening, fast and bright while processing,
// pulsing while speaking, grey and still when muted.

'use client';

import { useEffect, useRef } from 'react';

export type SphereMood = 'listening' | 'hearing' | 'thinking' | 'speaking' | 'muted';

const N = 520;

export function JarvisSphere({ mood, size = 280 }: { mood: SphereMood; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const moodRef = useRef(mood);
  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // points on a sphere (golden spiral) + a little jitter so it looks "built"
    const pts = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      return { x: Math.cos(th) * r, y, z: Math.sin(th) * r, s: 1 + Math.random() * 2.2, tw: Math.random() * 6.28 };
    });
    const rings = [
      { tilt: 0.35, r: 1.18, w: 1.2, speed: 0.6 },
      { tilt: -0.9, r: 1.32, w: 0.8, speed: -0.4 },
      { tilt: 1.3, r: 1.05, w: 0.6, speed: 0.9 },
    ];

    let raf = 0;
    let t0 = performance.now();
    let rot = 0;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      const m = moodRef.current;
      const speed = reduced ? 0.08 : m === 'thinking' ? 1.6 : m === 'hearing' ? 0.8 : m === 'muted' ? 0.05 : 0.35;
      rot += dt * speed;
      const pulse = m === 'speaking' ? 1 + Math.sin(now / 110) * 0.06 : m === 'hearing' ? 1 + Math.sin(now / 260) * 0.03 : 1;
      const bright = m === 'muted' ? 0.3 : m === 'thinking' ? 1.25 : m === 'listening' ? 0.9 : 1.1;
      const hue = m === 'muted' ? '160,160,170' : '255,150,40';
      const R = size * 0.33 * pulse;
      const cx = size / 2;
      const cy = size / 2;

      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'lighter';

      // core glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.9);
      g.addColorStop(0, `rgba(255,235,170,${0.9 * bright})`);
      g.addColorStop(0.2, `rgba(255,170,60,${0.5 * bright})`);
      g.addColorStop(0.55, `rgba(${hue},${0.18 * bright})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // particles
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      const ct = Math.cos(0.4);
      const st = Math.sin(0.4);
      for (const p of pts) {
        const x = p.x * cr - p.z * sr;
        let z = p.x * sr + p.z * cr;
        const y = p.y * ct - z * st;
        z = p.y * st + z * ct;
        const depth = (z + 1.4) / 2.4; // 0 back … 1 front
        const tw = 0.6 + 0.4 * Math.sin(now / 300 + p.tw);
        ctx.fillStyle = `rgba(${hue},${Math.min(1, (0.25 + 0.9 * depth) * bright * tw)})`;
        const s = p.s * (0.5 + depth);
        ctx.fillRect(cx + x * R - s / 2, cy + y * R - s / 2, s, s);
      }

      // orbit rings (dashed arcs)
      for (const ring of rings) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.tilt + rot * ring.speed * 0.3);
        ctx.scale(1, 0.32);
        ctx.strokeStyle = `rgba(${hue},${0.7 * bright})`;
        ctx.lineWidth = ring.w * 2.5;
        ctx.setLineDash([R * 0.08, R * 0.05, R * 0.02, R * 0.05]);
        ctx.lineDashOffset = -now / (m === 'thinking' ? 8 : 30);
        ctx.beginPath();
        ctx.arc(0, 0, R * ring.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}
