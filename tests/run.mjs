// tests/run.mjs — Node tests for the pure logic of Palm Heat Cover Studio
// (ink pipeline, grades, layout geometry, crop math). Run with:
//   node --test tests/run.mjs
// No browser needed: the tested functions take plain {width, height, data}
// images and plain numbers.

import test from 'node:test';
import assert from 'node:assert/strict';
import { GRADES, GRADE_IDS, gradeById, gradeColor, hexRgb, meanLuminance, shadowFloorFor } from '../app/src/grades.js';
import { LAYOUT_IDS, layoutPanels, heroIsLargest } from '../app/src/layouts.js';
import {
  SAMPLE_PHOTOS,
  DEFAULT_COVER,
  coverCropRect,
  posterizeTone,
  sobelEdges,
  dilateMask,
  grainNoise,
  applyInk,
} from '../app/src/cover.js';

function makeImage(w, h, fill) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = fill(i % w, Math.floor(i / w));
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { width: w, height: h, data };
}

// ---------------------------------------------------------------- grades
test('five distinct grades, each with a 5-tone palette', () => {
  assert.deepEqual([...GRADE_IDS].sort(), ['golden', 'neon', 'noir', 'teal', 'vice']);
  for (const id of GRADE_IDS) {
    const g = GRADES[id];
    assert.equal(g.palette.length, 5, `${id} palette`);
    assert.equal(new Set(g.palette).size, 5, `${id} palette tones differ`);
    assert.match(g.ink, /^#[0-9a-f]{6}$/);
    assert.ok(g.halftone >= 4 && g.halftone <= 7);
  }
});

test('gradeColor maps 0 and 1 to the palette ends', () => {
  for (const id of GRADE_IDS) {
    const g = GRADES[id];
    assert.deepEqual(gradeColor(g, 0), hexRgb(g.palette[0]));
    assert.deepEqual(gradeColor(g, 1), hexRgb(g.palette[4]));
  }
});

test('unknown grade falls back to Vice Sunset', () => {
  assert.equal(gradeById('nope').id, 'vice');
});

test('shadow floor lifts dark photos (v2.1 fix)', () => {
  const vice = GRADES.vice;
  assert.ok(shadowFloorFor(vice, 0.1) >= 0.24, 'very dark photo lifted');
  assert.ok(shadowFloorFor(vice, 0.3) >= 0.19, 'dim photo lifted a little');
  assert.equal(shadowFloorFor(vice, 0.8), vice.shadowFloor, 'bright photo unchanged');
});

test('meanLuminance of a white image is 1, black is 0', () => {
  assert.equal(meanLuminance(makeImage(4, 4, () => [255, 255, 255])), 1);
  assert.equal(meanLuminance(makeImage(4, 4, () => [0, 0, 0])), 0);
});

// ---------------------------------------------------------------- layouts
function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

for (const id of LAYOUT_IDS) {
  test(`layout ${id}: panels inside the canvas, no overlaps, hero largest`, () => {
    for (const [W, H] of [[1920, 1080], [1080, 1080], [1080, 1350]]) {
      const panels = layoutPanels(id, W, H);
      assert.ok(panels.length >= 5 && panels.length <= 6, `${id} panel count`);
      for (const p of panels) {
        assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w <= W + 1 && p.y + p.h <= H + 1,
          `${id} panel inside ${W}x${H}`);
        assert.ok(p.w > 50 && p.h > 50, `${id} panel not degenerate`);
      }
      for (let i = 0; i < panels.length; i++) {
        for (let j = i + 1; j < panels.length; j++) {
          assert.ok(!overlaps(panels[i], panels[j]), `${id} panels ${i}/${j} overlap`);
        }
      }
      assert.ok(heroIsLargest(panels), `${id} hero is largest`);
    }
  });
}

// ---------------------------------------------------------------- crop math
test('coverCropRect: window stays inside the photo', () => {
  for (const [fx, fy] of [[0, 0], [1, 1], [0.5, 0.5], [0.9, 0.1]]) {
    const r = coverCropRect(800, 600, 500, 400, fx, fy, true);
    assert.ok(r.sx >= 0 && r.sy >= 0, 'origin inside');
    assert.ok(r.sx + r.sw <= 800 + 0.001 && r.sy + r.sh <= 600 + 0.001, 'window inside');
  }
});

test('coverCropRect: hero headroom keeps the focal point 38% down the window', () => {
  // Portrait photo (boulevard 544x720) into a wide hero panel: the window
  // is a horizontal slice; with headroom the face at fy=0.3 must sit
  // 38% down from the window top, not cut off above it.
  const r = coverCropRect(544, 720, 1056, 756, 0.5, 0.3, true);
  const faceY = 0.3 * 720;
  const rel = (faceY - r.sy) / r.sh;
  assert.ok(rel > 0.3 && rel < 0.45, `face at ${rel.toFixed(2)} of window height`);
  assert.ok(r.sy <= faceY, 'window top is above the face');
});

test('coverCropRect: without headroom the window centres on the focal point', () => {
  const r = coverCropRect(800, 600, 400, 400, 0.5, 0.5, false);
  assert.ok(Math.abs(r.sx + r.sw / 2 - 400) < 1);
  assert.ok(Math.abs(r.sy + r.sh / 2 - 300) < 1);
});

// ---------------------------------------------------------------- ink pipeline
test('posterizeTone splits luminance into 5 bands', () => {
  assert.equal(posterizeTone(0), 0);
  assert.equal(posterizeTone(0.19), 0);
  assert.equal(posterizeTone(0.2), 1);
  assert.equal(posterizeTone(0.99), 4);
  assert.equal(posterizeTone(1), 4);
});

test('sobelEdges finds a vertical edge and ignores a flat field', () => {
  const flat = makeImage(8, 8, () => [128, 128, 128]);
  const grayFlat = new Float32Array(64).fill(128);
  const magFlat = sobelEdges(grayFlat, 8, 8);
  assert.ok(magFlat.every((v) => v === 0), 'flat field has no edges');

  const half = makeImage(8, 8, (x) => (x < 4 ? [0, 0, 0] : [255, 255, 255]));
  const gray = new Float32Array(64);
  for (let i = 0; i < 64; i++) gray[i] = half.data[i * 4];
  const mag = sobelEdges(gray, 8, 8);
  let edgeCount = 0;
  for (let y = 1; y < 7; y++) {
    for (let x = 1; x < 7; x++) {
      if (mag[y * 8 + x] > 90) edgeCount++;
    }
  }
  assert.ok(edgeCount >= 6, `edge found at the step (${edgeCount} px)`);
});

test('dilateMask grows an edge by the radius', () => {
  const mask = new Uint8Array(25);
  mask[12] = 1;
  const out = dilateMask(mask, 5, 5, 1);
  assert.equal(out.filter(Boolean).length, 9, '3x3 neighbourhood lit');
});

test('grainNoise is deterministic and bounded', () => {
  assert.equal(grainNoise(3, 7), grainNoise(3, 7));
  assert.ok(Math.abs(grainNoise(3, 7)) <= 1);
  assert.notEqual(grainNoise(3, 7), grainNoise(4, 7));
});

test('applyInk: dark photo keeps readable shadow detail (v2.1 fix)', () => {
  // A dark photo (mean luminance ~0.12, like the camera panel): after the
  // ink pass no large region may stay near-black.
  const img = makeImage(40, 40, (x, y) => {
    const v = 20 + Math.round(20 * Math.sin(x * 0.4) * Math.cos(y * 0.3));
    return [v, v, v];
  });
  applyInk(img, { grade: GRADES.vice, inkWidth: 1, grain: 0, gradeMix: 0.7 });
  let sum = 0;
  for (let i = 0; i < 1600; i++) sum += img.data[i * 4];
  const mean = sum / 1600;
  assert.ok(mean > 40, `lifted mean channel is ${mean.toFixed(1)}, was ~30`);
});

test('applyInk: a hard edge becomes ink coloured', () => {
  const img = makeImage(32, 32, (x) => (x < 16 ? [240, 240, 240] : [10, 10, 10]));
  applyInk(img, { grade: GRADES.vice, inkWidth: 2, grain: 0, gradeMix: 0.7 });
  // Pixels straddling the step must be ink (dark purple #160a24).
  let inked = 0;
  for (let y = 4; y < 28; y++) {
    for (let x = 14; x < 18; x++) {
      const o = (y * 32 + x) * 4;
      if (img.data[o] < 40 && img.data[o + 1] < 30) inked++;
    }
  }
  assert.ok(inked >= 20, `inked ${inked} px along the edge`);
});

// ---------------------------------------------------------------- presets
test('default cover uses five different photos', () => {
  assert.equal(DEFAULT_COVER.photos.length, 5);
  assert.equal(new Set(DEFAULT_COVER.photos).size, 5);
  for (const id of DEFAULT_COVER.photos) {
    assert.ok(SAMPLE_PHOTOS.some((p) => p.id === id), `known photo ${id}`);
  }
});

test('six bundled sample photos, each with a focal point', () => {
  assert.equal(SAMPLE_PHOTOS.length, 6);
  for (const p of SAMPLE_PHOTOS) {
    assert.ok(p.fx >= 0 && p.fx <= 1 && p.fy >= 0 && p.fy <= 1, `${p.id} focal in range`);
    assert.match(p.src, /^samples\/[a-z]+\.jpg$/);
  }
});
