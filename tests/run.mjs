// Palm Heat Cover Studio — Node tests for the pure logic.
// Run: node tests/run.mjs  (no dependencies, no browser, no network)
import test from 'node:test';
import assert from 'node:assert/strict';
import { cropWindow, sobelAt, grainAt } from '../app/src/cover.js';
import { GRADES, gradeById, posterizeTone, luminance, halftoneLightens, hexToRgb } from '../app/src/grades.js';
import { LAYOUTS, layoutPanels, layoutById, EXPORT_SIZES } from '../app/src/layouts.js';

// --- face-safe crop ---------------------------------------------------------
test('hero crop of the boulevard portrait keeps the face in frame', () => {
  // boulevard.jpg is 544x720; the woman's face sits at y 0.05..0.35.
  const w = cropWindow(544, 720, 640, 640, 0.5, 0.18, 1);
  assert.ok(w.sy <= 36, `window top ${w.sy} must start at or above the face (y=36)`);
  assert.ok(w.sy + w.sh >= 252, 'window must reach below the chin (y=252)');
  assert.equal(Math.round(w.sw), 544);
});

test('hero crop of the pier square keeps the face in frame', () => {
  const w = cropWindow(720, 720, 640, 640, 0.45, 0.2, 1);
  assert.ok(w.sy <= 58, `window top ${w.sy} must start at or above the face (y=58)`);
  assert.ok(w.sy + w.sh >= 274, 'window must reach below the chin (y=274)');
});

test('wide panel crop of the skyline sits on the busy horizon band', () => {
  // skyline.jpg is 800x600; the horizon/fog band is y 0.45..1.0.
  const w = cropWindow(800, 600, 505, 370, 0.5, 0.55, 1);
  assert.ok(w.sy >= 0 && w.sy + w.sh <= 600);
  assert.ok(w.sy + w.sh > 400, 'window must include the textured field, not just sky');
});

test('crop window never leaves the photo, at any zoom', () => {
  for (const zoom of [1, 1.5, 2.5]) {
    const w = cropWindow(800, 600, 400, 300, 0.9, 0.9, zoom);
    assert.ok(w.sx >= 0 && w.sy >= 0);
    assert.ok(w.sx + w.sw <= 800 + 1e-6 && w.sy + w.sh <= 600 + 1e-6);
  }
});

test('zoom narrows the crop window', () => {
  const a = cropWindow(800, 600, 400, 300, 0.5, 0.5, 1);
  const b = cropWindow(800, 600, 400, 300, 0.5, 0.5, 2);
  assert.ok(b.sw < a.sw && b.sh < a.sh);
});

// --- ink pipeline math ------------------------------------------------------
test('posterizeTone splits luminance into five bands', () => {
  assert.deepEqual(
    [0, 40, 90, 140, 190, 240, 255].map((l) => posterizeTone(l, 0)),
    [0, 0, 1, 2, 3, 4, 4],
  );
});

test('shadow lift raises the darkest band (dark panel stays readable)', () => {
  assert.equal(posterizeTone(10, 0), 0);
  assert.ok(posterizeTone(10, 0.2) >= 1, 'a near-black pixel lifts out of tone 0');
  assert.equal(posterizeTone(250, 0.2), 4, 'white stays white under lift');
});

test('luminance weights green most', () => {
  assert.ok(luminance(0, 255, 0) > luminance(255, 0, 0));
  assert.ok(luminance(255, 0, 0) > luminance(0, 0, 255));
});

test('sobel finds a hard vertical edge and ignores a flat field', () => {
  const w = 5;
  const h = 5;
  const gray = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) gray[y * w + x] = x < 2 ? 0 : 255;
  assert.ok(sobelAt(gray, w, h, 2, 2) > 500, 'edge magnitude at the step');
  assert.equal(sobelAt(gray, w, h, 4, 2), 0, 'flat field has no edge');
});

test('halftone only dots the two darkest tones', () => {
  assert.equal(halftoneLightens(2, 0, 0), false);
  assert.equal(halftoneLightens(4, 0, 0), false);
  // Over the 4x4 Bayer cells, tone 0 lightens some cells and not others.
  let lightened = 0;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (halftoneLightens(0, x, y)) lightened++;
  assert.ok(lightened > 0 && lightened < 16, `tone 0 lightens ${lightened}/16 cells`);
});

test('grain is deterministic and bounded', () => {
  assert.equal(grainAt(3, 7, 10), grainAt(3, 7, 10));
  assert.ok(Math.abs(grainAt(3, 7, 10)) <= 10);
  assert.ok(Math.abs(grainAt(100, 200, 9)) <= 9);
});

test('hexToRgb parses palette colours', () => {
  assert.deepEqual(hexToRgb('#ff9e57'), [255, 158, 87]);
});

// --- grades -----------------------------------------------------------------
test('five distinct grades, each with a 5-step palette', () => {
  assert.equal(GRADES.length, 5);
  const ids = new Set(GRADES.map((g) => g.id));
  assert.equal(ids.size, 5, 'grade ids are unique');
  for (const g of GRADES) {
    assert.equal(g.palette.length, 5);
    assert.ok(g.ink && g.glow && g.halftone > 0);
  }
  // No two grades share a palette.
  const pals = new Set(GRADES.map((g) => g.palette.join(',')));
  assert.equal(pals.size, 5, 'palettes are distinct');
  assert.equal(gradeById('noir-ink').name, 'Noir Ink');
  assert.equal(gradeById('bogus').id, 'vice-sunset', 'unknown grade falls back');
});

// --- layouts ----------------------------------------------------------------
test('every layout has exactly five panels inside its canvas', () => {
  for (const l of LAYOUTS) {
    const panels = layoutPanels(l.id);
    assert.equal(panels.length, 5, `${l.id} must have 5 panels, one per photo`);
    assert.equal(panels[0].role, 'hero', `${l.id} leads with the hero panel`);
    for (const p of panels) {
      assert.ok(p.x >= 0 && p.y >= 0);
      assert.ok(p.x + p.w <= l.w && p.y + p.h <= l.h, `${l.id} panel exceeds canvas`);
      assert.ok(p.w >= 300 && p.h >= 300, `${l.id} panel is big enough to read`);
    }
  }
});

test('hero panel is the biggest panel in the hero layout', () => {
  const panels = layoutPanels('hero');
  const hero = panels[0];
  assert.ok(panels.slice(1).every((p) => p.w * p.h < hero.w * hero.h));
});

test('tilted layout tilts only the supporting panels', () => {
  const panels = layoutPanels('tilted');
  assert.equal(panels[0].tilt, undefined);
  assert.ok(panels.slice(1).every((p) => typeof p.tilt === 'number' && p.tilt !== 0));
});

test('export sizes cover the three post formats', () => {
  assert.deepEqual(EXPORT_SIZES.map((s) => s.id), ['1080x1080', '1080x1350', '1920x1080']);
  assert.equal(layoutById('bogus').id, 'hero', 'unknown layout falls back');
});
