// Node tests for the pure logic: grades, layouts, cover-fit math and the
// bottom-up title geometry (the star fix). Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { GRADES, gradeById } from '../app/src/grades.js';
import {
  LAYOUTS, layoutPanels, heroLedPanels, coverFitRect, titleBlockGeometry,
  fitTitleSize, layoutById,
} from '../app/src/layouts.js';
import { defaultState, SAMPLE_PHOTOS, EXPORT_SIZES } from '../app/src/cover.js';

test('six grades, all distinct, all gentle (no posterize fields)', () => {
  assert.equal(GRADES.length, 6);
  const ids = new Set(GRADES.map((g) => g.id));
  assert.equal(ids.size, 6);
  for (const g of GRADES) {
    assert.equal(typeof g.warmth, 'number');
    assert.equal(typeof g.glow, 'number');
    assert.equal(typeof g.vignette, 'number');
    assert.ok(!('posterize' in g) && !('halftone' in g) && !('ink' in g));
    assert.ok(g.saturation >= 0.8 && g.saturation <= 1.3);
    assert.ok(g.brightness >= 0.9 && g.brightness <= 1.1);
  }
  assert.equal(gradeById('neon-night').name, 'Neon Night');
  assert.equal(gradeById('nope').id, 'vice-sunset'); // unknown falls back
});

test('six layouts, all known by id', () => {
  assert.equal(LAYOUTS.length, 6);
  for (const l of LAYOUTS) assert.equal(layoutById(l.id).id, l.id);
});

test('hero-led: 5 panels, 5 different photos, all inside the frame', () => {
  for (const [W, H] of [[1080, 1080], [1080, 1350], [1920, 1080], [1280, 720]]) {
    const panels = heroLedPanels(W, H);
    assert.equal(panels.length, 5);
    const photos = new Set(panels.map((p) => p.photo));
    assert.equal(photos.size, 5, `5 distinct photos at ${W}x${H}`);
    for (const p of panels) {
      assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w <= W + 0.01 && p.y + p.h <= H + 0.01);
      assert.ok(p.w > 100 && p.h > 100, 'no tiny/empty panel');
    }
    const hero = panels.find((p) => p.hero);
    assert.ok(hero && hero.w >= W * 0.5, 'hero dominates the cover');
  }
});

test('every layout: panels inside frame, hero present, no empty panel', () => {
  for (const l of LAYOUTS) {
    for (const [W, H] of [[1080, 1080], [1080, 1350], [1920, 1080]]) {
      const panels = layoutPanels(l.id, W, H);
      assert.ok(panels.length >= 5, `${l.id} has >= 5 panels`);
      assert.ok(panels.some((p) => p.hero), `${l.id} has a hero`);
      for (const p of panels) {
        assert.ok(p.x >= -0.01 && p.y >= -0.01 && p.x + p.w <= W + 0.01 && p.y + p.h <= H + 0.01,
          `${l.id} panel inside ${W}x${H}`);
        assert.ok(p.w >= 80 && p.h >= 80, `${l.id} panel is not empty`);
      }
    }
  }
});

test('cover-fit: focus-anchored crop never leaves the image, hero focus is upper third', () => {
  const r = coverFitRect(800, 600, 600, 1080, 0.5, 0.22, 1);
  assert.ok(r.sx >= 0 && r.sy >= 0 && r.sx + r.sw <= 800 && r.sy + r.sh <= 600);
  // Hero focus 0.22 keeps the top of the photo (head + shoulders) in frame.
  assert.ok(r.sy < 600 * 0.15, 'hero crop starts near the top of the photo');
  const zoomed = coverFitRect(800, 600, 600, 1080, 0.5, 0.5, 2);
  assert.ok(zoomed.sw < r.sw && zoomed.sh < r.sh, 'zoom narrows the crop');
});

test('star fix: 5 stars fully inside frame with >= 36px clear below, every size', () => {
  for (const [W, H] of [[1080, 1080], [1080, 1350], [1920, 1080], [1280, 720], [1024, 1280]]) {
    const g = titleBlockGeometry(W, H);
    assert.ok(g.clearBelow >= 36, `clear space below stars at ${W}x${H}: ${g.clearBelow}px`);
    assert.ok(g.starsBottom <= H - 36);
    assert.ok(g.starsY > g.titleY, 'stars sit below the title');
    assert.ok(g.scrimTop < g.subY, 'scrim starts above the subtitle');
    assert.ok(g.subY > 0 && g.titleY > 0, 'title block inside frame');
  }
});

test('fitTitleSize shrinks a long title to fit', () => {
  // A measuring stub whose width scales with the current font size.
  let size = 120;
  const ctx = {
    set font(v) { size = parseInt(v, 10); },
    get font() { return `${size}px Anton`; },
    measureText: (t) => ({ width: t.length * size * 0.62 }),
  };
  const fitted = fitTitleSize(ctx, 'LEONIDA NIGHTS', 120, 500);
  assert.ok(fitted < 120, 'long title shrinks');
  assert.ok(ctx.measureText('LEONIDA NIGHTS').width <= 500 + 1);
});

test('default state: 5 different photos, 6 sample photos total', () => {
  assert.equal(SAMPLE_PHOTOS.length, 6);
  assert.equal(new Set(SAMPLE_PHOTOS.map((p) => p.id)).size, 6);
  const s = defaultState();
  assert.equal(s.panels.length, 5);
  assert.equal(new Set(s.panels.map((p) => p.photo)).size, 5);
  assert.equal(s.title, 'LEONIDA NIGHTS');
  assert.equal(EXPORT_SIZES.length, 3);
  assert.deepEqual(EXPORT_SIZES.map((e) => e.id), ['1080x1080', '1080x1350', '1920x1080']);
});
