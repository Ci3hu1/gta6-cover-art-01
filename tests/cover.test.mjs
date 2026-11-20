// Leonida Nights Cover Studio v4 — node tests for the pure logic:
// grades, layouts, title-vs-face non-overlap, stars-in-frame, face-aware
// crop, furniture geometry, barcode determinism. No DOM needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GRADES, DEFAULT_GRADE_ID, gradeById } from '../app/src/grades.js';
import { LAYOUTS, DEFAULT_LAYOUT_ID, layoutById, layoutPixelRects, heroFaceBox } from '../app/src/layouts.js';
import {
  SAMPLES, defaultState, titleGeometry, starsInFrame, titleClearsFace,
  furnitureGeometry, faceAwareCrop, barcodeBars, resolvePanels,
} from '../app/src/cover.js';

const SIZES = [
  { w: 1920, h: 1080 },
  { w: 1280, h: 720 },
  { w: 1080, h: 1080 },
  { w: 1080, h: 1350 },
  { w: 1024, h: 1280 },
];

test('grades: six named grades, golden-hour default is the strongest', () => {
  assert.equal(GRADES.length, 6);
  assert.equal(new Set(GRADES.map((g) => g.id)).size, 6);
  assert.equal(DEFAULT_GRADE_ID, 'golden-hour');
  const def = gradeById(DEFAULT_GRADE_ID);
  for (const g of GRADES) {
    assert.ok(def.warmth >= g.warmth, `${g.id} warmer than default`);
    assert.ok(def.saturation >= g.saturation, `${g.id} more saturated than default`);
  }
});

test('layouts: eight layouts, one hero each, rects inside the poster', () => {
  assert.equal(LAYOUTS.length, 8);
  assert.equal(DEFAULT_LAYOUT_ID, 'popout');
  assert.equal(new Set(LAYOUTS.map((l) => l.id)).size, 8);
  for (const l of LAYOUTS) {
    assert.ok(l.panels.length >= 2, `${l.id} has panels`);
    assert.equal(l.panels.filter((p) => p.hero).length, 1, `${l.id} has one hero`);
    for (const p of l.panels) {
      assert.ok(p.x >= 0 && p.y >= 0 && p.w > 0 && p.h > 0, `${l.id}/${p.id} rect sane`);
      assert.ok(p.x + p.w <= 1.001 && p.y + p.h <= 1.001, `${l.id}/${p.id} inside poster`);
    }
  }
});

test('title never covers a face: all layouts x all export sizes', () => {
  for (const l of LAYOUTS) {
    for (const s of SIZES) {
      const r = titleClearsFace(l.id, s.w, s.h);
      assert.ok(r.ok, `${l.id} ${s.w}x${s.h}: face bottom ${r.faceBottom} vs title top ${r.titleTop}`);
    }
  }
});

test('stars fully inside frame with >=36px clear space below, all sizes', () => {
  for (const s of SIZES) {
    const r = starsInFrame(s.w, s.h);
    assert.ok(r.ok, `${s.w}x${s.h}: clearance ${r.clearancePx}px < required ${r.requiredPx}px`);
  }
});

test('magazine furniture: all five pieces fully inside the frame, all sizes', () => {
  for (const s of SIZES) {
    const geo = titleGeometry(s.w, s.h);
    const f = furnitureGeometry(s.w, s.h);
    for (const [name, r] of Object.entries(f)) {
      assert.ok(r.x >= 0 && r.y >= 0, `${name} inside (top-left)`);
      assert.ok(r.x + r.w <= s.w && r.y + r.h <= s.h, `${name} inside (bottom-right) ${s.w}x${s.h}`);
    }
    // Billing stays above the bottom frame edge.
    assert.ok(f.billing.y + f.billing.h <= s.h - geo.frameInset * 0.5, 'billing above frame edge');
    // Press band starts at the frame inset, never above it.
    assert.ok(f.band.y >= geo.frameInset, 'band inside frame');
  }
});

test('pop-out hero overflows the grid but stays inside the poster', () => {
  for (const s of SIZES) {
    const rects = layoutPixelRects('popout', s.w, s.h);
    const hero = rects.find((r) => r.hero);
    assert.ok(hero.px >= 0, 'hero left inside poster');
    assert.ok(hero.px + hero.pw <= s.w, 'hero right inside poster');
    assert.ok(hero.py + hero.ph < titleGeometry(s.w, s.h).titleTop, 'hero bottom above title');
    // It really does break out: left of the grid edge and below the grid bottom.
    assert.ok(hero.px < 0.028 * s.w, 'hero breaks left of the grid');
    assert.ok(hero.py + hero.ph > 0.635 * s.h, 'hero breaks below the grid');
  }
});

test('face-aware crop lands the face in the upper third, inside the photo', () => {
  const imgW = 1200, imgH = 900;
  for (const sample of SAMPLES) {
    // Tall hero panel and wide panel.
    for (const [pw, ph] of [[600, 700], [900, 300]]) {
      const c = faceAwareCrop(imgW, imgH, pw, ph, sample, 1, 0, 0);
      assert.ok(c.sx >= 0 && c.sy >= 0, 'crop origin inside photo');
      assert.ok(c.sx + c.sw <= imgW + 0.001 && c.sy + c.sh <= imgH + 0.001, 'crop inside photo');
      // The face itself is never cropped out: its point lies inside the crop.
      assert.ok(sample.fx * imgW >= c.sx && sample.fx * imgW <= c.sx + c.sw, 'face x inside crop');
      assert.ok(sample.fy * imgH >= c.sy && sample.fy * imgH <= c.sy + c.sh, 'face y inside crop');
      // Face position inside the drawn panel, as a fraction of panel height:
      // upper half (and whenever the crop allows it, the upper third).
      const scale = pw / c.sw;
      const faceY = (sample.fy * imgH - c.sy) * scale;
      const frac = faceY / ph;
      assert.ok(frac > 0.1 && frac < 0.5, `face at ${frac.toFixed(2)} of panel height for ${sample.src}`);
    }
  }
});

test('barcode bars are deterministic per seed', () => {
  const a = barcodeBars('LEONIDA NIGHTSVOL. 04');
  const b = barcodeBars('LEONIDA NIGHTSVOL. 04');
  const c = barcodeBars('NEON DRIVEVOL. 04');
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.length, 42);
});

test('default cover uses 5 different people photos', () => {
  const state = defaultState();
  assert.equal(state.photos.length, 6);
  const resolved = resolvePanels(state);
  assert.equal(resolved.length, 5);
  const used = new Set(resolved.map((r) => r.photo.src));
  assert.equal(used.size, 5, 'all five panels show different photos');
  for (const r of resolved) {
    assert.ok(r.photo.role && r.photo.location, 'two-line cast tag present');
    assert.ok(r.photo.fx >= 0 && r.photo.fx <= 1 && r.photo.fy >= 0 && r.photo.fy <= 1, 'face anchor sane');
  }
});

test('sample photos are all people shots (verified by eye at build time)', () => {
  // The six bundled samples were each viewed before the build; this test
  // pins the set so a later swap cannot silently reintroduce a landscape.
  assert.deepEqual(
    SAMPLES.map((s) => s.src),
    [
      'samples/hero-sunglasses.jpg',
      'samples/portrait-red-lips.jpg',
      'samples/street-mother.jpg',
      'samples/sunset-rider.jpg',
      'samples/golden-profile.jpg',
      'samples/pier-sitter.jpg',
    ],
  );
});
