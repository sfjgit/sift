// File: clap.ts
// Path: src/features/ai/clap.ts
//
// Double-clap detector (Web Audio, free, runs in the browser). A clap is a
// sharp spike far above the room's background level; two of them 0.15–0.7 s
// apart = a double clap. Speech and steady noise don't qualify.

import { onNextGesture } from './speech';

export const startClapDetector = async (onDoubleClap: () => void): Promise<() => void> => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const ctx = new AudioContext();
  // a fresh browser keeps audio paused until the first click / key press
  const unpause = () => void ctx.resume();
  let dropGesture: (() => void) | null = null;
  if (ctx.state === 'suspended') dropGesture = onNextGesture(unpause);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  let background = 0.02; // running loudness of the room
  let lastSpike = 0;
  let firstClap = 0;
  let paused = false;

  const tick = () => {
    if (paused) return;
    analyser.getFloatTimeDomainData(buf);
    let peak = 0;
    let sum = 0;
    for (const v of buf) {
      const a = Math.abs(v);
      if (a > peak) peak = a;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    const now = performance.now();
    const spike = peak > 0.45 && peak > background * 9 && now - lastSpike > 120;
    if (spike) {
      lastSpike = now;
      const gap = now - firstClap;
      if (firstClap && gap > 150 && gap < 700) {
        firstClap = 0;
        onDoubleClap();
      } else firstClap = now;
    } else {
      background = background * 0.97 + rms * 0.03;
    }
    if (firstClap && now - firstClap > 700) firstClap = 0;
  };
  const id = window.setInterval(tick, 25);

  return () => {
    paused = true;
    dropGesture?.();
    window.clearInterval(id);
    stream.getTracks().forEach(t => t.stop());
    void ctx.close();
  };
};
