// Tests for grades (app/src/grades.js) and layouts (app/src/layouts.js).
// Run: node tests/run.mjs
import assert from 'node:assert/strict';
import { GRADES, gradeById, gradeColor, palettesDistinct } from '../app/src/grades.js';
import { LAYOUTS, layoutRects, layoutById, scaleRects, overlapArea } from '../app/src/layouts.js';

export function testGrades() {
  assert.equal(GRADES.length, 5, 'exactly five grades');
  const ids = new Set(GRADES.map((g) => g.id));
  assert.equal(ids.size, 5, 'grade ids are unique');
  for (const g of GRADES) {
    assert.equal(g.palette.length, 5, `${g.id} must have 5 palette tones`);
    assert.equal(g.ink.length, 3, `${g.id} ink must be an RGB triple`);
    assert.ok(g.halftone >= 0 && g.halftone <= 1, `${g.id} halftone density in range`);
    assert.ok(g.titleGradient.length === 2, `${g.id} title gradient has two stops`);
    assert.ok(g.paper.length === 3, `${g.id} paper colour is an RGB triple`);
  }
  // Every pair of grades must read as a different grade.
  for (let i = 0; i < GRADES.length; i++) {
    for (let j = i + 1; j < GRADES.length; j++) {
      assert.ok(palettesDistinct(GRADES[i], GRADES[j]), `${GRADES[i].id} vs ${GRADES[j].id} must differ`);
    }
  }
  assert.equal(gradeById('neon').name, 'Neon Night');
  assert.equal(gradeById('no-such-grade').id, 'vice', 'unknown id falls back to the first grade');
  assert.deepEqual(gradeColor(gradeById('noir'), 0), [17, 17, 17]);
  assert.deepEqual(gradeColor(gradeById('noir'), 4), [242, 242, 242]);
  assert.deepEqual(gradeColor(gradeById('noir'), 99), [242, 242, 242], 'tone clamps to 4');
}

export function testLayouts() {
  assert.equal(LAYOUTS.length, 5, 'five layouts (4 + tilted variant)');
  for (const layout of LAYOUTS) {
    const rects = layoutRects(layout.id, 5);
    assert.equal(rects.length, 5, `${layout.id} must return 5 panels`);
    for (const r of rects) {
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 1.0001 && r.y + r.h <= 1.0001,
        `${layout.id} rect ${JSON.stringify(r)} must stay inside the content area`);
      assert.ok(r.w > 0.1 && r.h > 0.1, `${layout.id} panels must be substantial`);
    }
    // No two panels overlap (tilted rotations are visual only; rects are disjoint).
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        assert.equal(overlapArea(rects[i], rects[j]), 0, `${layout.id} panels ${i} and ${j} must not overlap`);
      }
    }
    // Hero panel (index 0) is at the top-left and ~2x a supporting panel
    // — except Classic Grid, which is a uniform 3+2 grid by design.
    const hero = rects[0];
    assert.ok(hero.x === 0 && hero.y === 0, `${layout.id} first panel must be top-left`);
    const others = rects.slice(1).map((r) => r.w * r.h).sort((a, b) => a - b);
    const median = others[Math.floor(others.length / 2)];
    if (layout.id === 'classic') {
      const areas = rects.map((r) => r.w * r.h);
      const max = Math.max(...areas);
      const min = Math.min(...areas);
      assert.ok(max <= 2 * min, `classic grid panels must stay balanced (max ${max} vs min ${min})`);
    } else {
      assert.ok(hero.w * hero.h >= 1.8 * median,
        `${layout.id} hero area ${hero.w * hero.h} must be >= 1.8x median panel ${median}`);
    }
    // Pixel scaling keeps the same guarantees.
    const px = scaleRects(rects, 1080, 900);
    for (let i = 0; i < px.length; i++) {
      for (let j = i + 1; j < px.length; j++) {
        assert.equal(overlapArea(px[i], px[j]), 0, `${layout.id} pixel rects must not overlap`);
      }
    }
  }
  // Tilted is the only layout with rotations.
  assert.ok(layoutRects('tilted').some((r) => r.rot !== 0), 'tilted must rotate panels');
  assert.ok(layoutRects('hero').every((r) => r.rot === 0), 'hero must not rotate panels');
  assert.equal(layoutById('wide').name, 'Wide');
  assert.equal(layoutById('nope').id, 'hero', 'unknown layout falls back to hero');
}
