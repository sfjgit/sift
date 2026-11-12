// Copies MapLibre's web worker into public/ so the office map can load it from
// a fixed URL (the bundler moves the library, which breaks its own worker path).
// Runs before dev and build; safe to run any time.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve('maplibre-gl/dist/maplibre-gl.css'));
mkdirSync('public/maplibre', { recursive: true });
copyFileSync(join(dist, 'maplibre-gl-worker.mjs'), 'public/maplibre/maplibre-gl-worker.mjs');
console.log('maplibre worker copied to public/maplibre/');
