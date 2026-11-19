// Tests for the comic-ink pipeline (app/src/cover.js pure functions).
// Run: node tests/run.mjs
import assert from 'node:assert/strict';
import {
  luminance, sobelEdges, dilateMask, posterizeTone, halftoneAt,
  mulberry32, inkRender,
} from '../app/src/cover.js';
import { gradeById } from '../app/src/grades.js';

export function testInk() {
  // Luminance weights sum to ~1 and white is 255.
  assert.ok(Math.abs(luminance(255, 255, 255) - 255) < 0.001);
  assert.ok(luminance(255, 0, 0) > luminance(0, 0, 255)); // red weights more than blue

  // Posterize: 5 distinct bands, dark -> light.
  assert.equal(posterizeTone(0), 0);
  assert.equal(posterizeTone(41), 0);
  assert.equal(posterizeTone(42), 1);
  assert.equal(posterizeTone(95), 1);
  assert.equal(posterizeTone(96), 2);
  assert.equal(posterizeTone(149), 2);
  assert.equal(posterizeTone(150), 3);
  assert.equal(posterizeTone(203), 3);
  assert.equal(posterizeTone(204), 4);
  assert.equal(posterizeTone(255), 4);

  // Sobel: flat field has no edges; a vertical step has a strong edge.
  const w = 9, h = 9;
  const flat = new Float32Array(w * h).fill(128);
  const flatEdges = sobelEdges(flat, w, h);
  assert.ok(flatEdges.every((v) => v === 0), 'flat field must have zero edges');
  const step = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) step[y * w + x] = x < 4 ? 30 : 220;
  const stepEdges = sobelEdges(step, w, h);
  const maxEdge = Math.max(...stepEdges);
  assert.ok(maxEdge > 0.5, `step edge should be strong, got ${maxEdge}`);
  assert.ok(stepEdges[4 * w + 2] < 0.05, 'far from the step there is no edge');

  // Dilate: radius 1 grows a single pixel to a 3x3 block; radius 0 is identity.
  const m = new Uint8Array(25);
  m[12] = 1;
  const d0 = dilateMask(m, 5, 5, 0);
  assert.equal(d0.reduce((a, b) => a + b, 0), 1);
  const d1 = dilateMask(m, 5, 5, 1);
  assert.equal(d1.reduce((a, b) => a + b, 0), 9);
  const d2 = dilateMask(m, 5, 5, 2);
  assert.equal(d2.reduce((a, b) => a + b, 0), 25);

  // Halftone: darker pixels get dots, bright pixels never do; density scales.
  assert.equal(halftoneAt(3, 3, 200, 6, 0.5), false);
  assert.equal(halftoneAt(3, 3, 0, 6, 0.5), true);
  // A dot centre is always a dot in the dark; density 0 means no dots.
  assert.equal(halftoneAt(3, 3, 0, 6, 0), false);

  // PRNG is deterministic per seed and differs across seeds.
  const r1 = mulberry32(7);
  const r2 = mulberry32(7);
  const r3 = mulberry32(8);
  assert.equal(r1(), r2());
  assert.notEqual(r1(), r3());

  // Full pipeline on a synthetic image: left half dark, right half light,
  // with a hard vertical edge. The output must:
  // - use only the grade's 5 palette colours + ink (posterized),
  // - paint the edge column in ink,
  // - be deterministic for the same seed.
  const grade = gradeById('vice');
  // Glow lifts highlights off-palette by design, so the palette-only
  // assertion uses a copy of the grade with glow off; glow itself is
  // asserted separately below.
  const noGlow = { ...grade, glow: { color: grade.glow.color, strength: 0 } };
  const W = 20, H = 10;
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const v = x < 10 ? 40 : 220;
      rgba[i] = v; rgba[i + 1] = v; rgba[i + 2] = v; rgba[i + 3] = 255;
    }
  }
  const out1 = inkRender(rgba, W, H, noGlow, { inkWidth: 1, grain: 0, seed: 7 });
  const out2 = inkRender(rgba, W, H, noGlow, { inkWidth: 1, grain: 0, seed: 7 });
  assert.deepEqual([...out1], [...out2], 'pipeline must be deterministic');
  const allowed = new Set([
    ...grade.palette.map((c) => c.join(',')),
    grade.ink.join(','),
  ]);
  for (let i = 0; i < W * H; i++) {
    const key = [out1[i * 4], out1[i * 4 + 1], out1[i * 4 + 2]].join(',');
    assert.ok(allowed.has(key), `pixel ${i} colour ${key} is not a palette/ink colour`);
  }
  // Glow on: a highlight pixel must shift toward the glow colour.
  const glowed = inkRender(rgba, W, H, grade, { inkWidth: 1, grain: 0, seed: 7 });
  let shifted = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 10; x < W; x++) {
      const i = (y * W + x) * 4;
      if (glowed[i + 1] < out1[i + 1]) shifted++;
    }
  }
  assert.ok(shifted > 0, 'glow must lift highlight pixels toward the glow colour');
  // The edge column (x=9..10) must contain ink pixels.
  let inkPixels = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 8; x <= 11; x++) {
      const i = (y * W + x) * 4;
      if ([out1[i], out1[i + 1], out1[i + 2]].join(',') === grade.ink.join(',')) inkPixels++;
    }
  }
  assert.ok(inkPixels > 0, 'the step edge must be inked');
  // Grain actually changes pixels (and stays deterministic per seed).
  const grainy = inkRender(rgba, W, H, noGlow, { inkWidth: 1, grain: 12, seed: 7 });
  assert.notDeepEqual([...grainy], [...out1], 'grain must change pixels');
}
