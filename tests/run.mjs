// tests/run.mjs — Node tests for the pure logic of Palm Heat Cover Studio.
// Run: `node tests/run.mjs` (Node 22, no dependencies).
// Covers: grades (5 distinct), layouts (panels in bounds, hero-led cover
// uses 5 different photos, focus points face-safe), the title-block
// geometry (THE stars fix: stars fully inside the frame with clear space
// below, at every layout and every export size), and the ink math
// (posterize bands, shadow lift).

import test from 'node:test';
import assert from 'node:assert/strict';
import { GRADES, gradeById, toneFor, liftShadow } from '../app/src/grades.js';
import { LAYOUTS, layoutById, panelRects, titleBlock, starCenters } from '../app/src/layouts.js';
import { coverFitRect } from '../app/src/cover.js';

const SIZES = [
  [1080, 1080],
  [1080, 1350],
  [1920, 1080],
  [1280, 720],
  [1024, 1280],
];

test('five grades, all distinct', () => {
  assert.equal(GRADES.length, 5);
  const ids = new Set(GRADES.map((g) => g.id));
  assert.equal(ids.size, 5);
  for (const g of GRADES) {
    assert.equal(g.tones.length, 5, g.id + ' needs 5 poster tones');
    assert.ok(g.tones[0][0] + g.tones[0][1] + g.tones[0][2] < 200, g.id + ' darkest tone must be dark');
    assert.ok(g.tones[4][0] + g.tones[4][1] + g.tones[4][2] > 500, g.id + ' lightest tone must be light');
    assert.ok(g.shadowLift >= 0.1, g.id + ' must lift shadows');
    assert.ok(g.halftone > 0 && g.halftone <= 1);
  }
  // Palettes really differ from each other.
  const sigs = new Set(GRADES.map((g) => JSON.stringify(g.tones)));
  assert.equal(sigs.size, 5);
  assert.equal(gradeById('nope').id, 'vice-sunset');
});

test('toneFor maps 0..1 across the palette', () => {
  const g = gradeById('vice-sunset');
  assert.deepEqual(toneFor(g, 0), g.tones[0]);
  const mid = toneFor(g, 0.5);
  assert.ok(mid[0] > g.tones[0][0] && mid[0] < g.tones[4][0]);
  const hi = toneFor(g, 0.999);
  assert.ok(hi[0] > 200);
});

test('liftShadow never returns near-black', () => {
  for (const g of GRADES) {
    assert.ok(liftShadow(g, 0) >= 0.1, g.id);
    assert.equal(liftShadow(g, 1), 1);
    assert.ok(liftShadow(g, 0.5) > 0.5);
  }
});

test('every layout: panels inside the frame, no panel empty', () => {
  for (const [id, layout] of Object.entries(LAYOUTS)) {
    assert.ok(layout.panels.length >= 4, id);
    for (const [W, H] of SIZES) {
      const rects = panelRects(id, W, H);
      for (const r of rects) {
        assert.ok(r.x >= 0 && r.y >= 0, `${id} panel out of frame`);
        assert.ok(r.x + r.w <= W && r.y + r.h <= H, `${id} panel overflows`);
        assert.ok(r.w >= 100 && r.h >= 100, `${id} panel too small`);
        assert.ok(r.fx >= 0 && r.fx <= 1 && r.fy >= 0 && r.fy <= 1);
      }
    }
  }
});

test('hero-led cover uses 5 different photos', () => {
  const hero = layoutById('hero');
  assert.equal(hero.panels.length, 5);
  const photos = new Set(hero.panels.map((p) => p.photo));
  assert.equal(photos.size, 5);
});

test('hero focus is face-safe (upper part of the photo)', () => {
  for (const [id, layout] of Object.entries(LAYOUTS)) {
    const heroPanel = layout.panels[0];
    assert.ok(heroPanel.fy <= 0.35, `${id} hero focus.y ${heroPanel.fy} risks cropping a face`);
  }
});

test('skyline panel crops the busy lower part, never empty sky', () => {
  for (const [id, layout] of Object.entries(LAYOUTS)) {
    const sky = layout.panels.find((p) => p.photo === 'skyline');
    if (sky) assert.ok(sky.fy >= 0.55, `${id} skyline focus.y ${sky.fy} risks empty sky`);
  }
});

test('THE STARS FIX: 5 stars fully inside the frame with clear space below, every size', () => {
  for (const [W, H] of SIZES) {
    const tb = titleBlock(W, H);
    // Clear space below the stars: at least 36px of frame under them.
    assert.ok(tb.bottomMargin >= 36, `${W}x${H} bottom margin ${tb.bottomMargin}`);
    assert.equal(tb.starsBottom, H - tb.bottomMargin);
    assert.ok(tb.starsBottom <= H - 36, `${W}x${H} stars bottom ${tb.starsBottom} too close to edge`);
    // Stars sit below the subtitle, which sits below the title.
    assert.ok(tb.titleBaseline < tb.subtitleBaseline, 'title above subtitle');
    assert.ok(tb.subtitleBaseline < tb.starsCy, 'subtitle above stars');
    assert.ok(tb.scrimTop < tb.titleBaseline - tb.titleSize, 'scrim covers the title');
    assert.ok(tb.titleBaseline - tb.titleSize > 0, 'title top inside frame');
    const stars = starCenters(W, H);
    assert.equal(stars.length, 5);
    for (const s of stars) {
      assert.ok(s.x - s.r >= 0 && s.x + s.r <= W, 'star horizontally inside frame');
      assert.ok(s.y - s.r >= 0 && s.y + s.r <= H, 'star vertically inside frame');
      assert.ok(H - (s.y + s.r) >= 36, 'clear space below star');
    }
    // Stars do not overlap each other.
    for (let i = 1; i < stars.length; i++) {
      assert.ok(stars[i].x - stars[i - 1].x > stars[i].r * 2, 'stars must not overlap');
    }
  }
});

test('coverFitRect keeps the focus point in frame', () => {
  // Wide photo into a tall panel, focus upper-third: source window must
  // include the focus and stay inside the image.
  const r = coverFitRect(800, 600, 400, 500, 0.5, 0.3, 1.05);
  assert.ok(r.sx >= 0 && r.sy >= 0);
  assert.ok(r.sx + r.sw <= 800 && r.sy + r.sh <= 600);
  const focusY = 0.3 * 600;
  assert.ok(focusY >= r.sy && focusY <= r.sy + r.sh, 'focus inside crop window');
  // Zoomed crop is smaller than the full image.
  const z = coverFitRect(800, 600, 400, 500, 0.5, 0.5, 1.5);
  assert.ok(z.sw < 800 && z.sh < 600);
});
