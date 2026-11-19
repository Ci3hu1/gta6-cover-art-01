// Palm Heat v2.1 tests — pure logic only, no browser needed. Run: node tests/run.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, existsSync, statSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sobelMagnitude, dilateMask, posterizeBand, halftoneDot, applyLift,
  fitPhotoToPanel, subjectBox, clamp,
} from '../app/src/ink.js';
import { GRADES, gradeById, gradesAreDistinct } from '../app/src/grades.js';
import { layoutPanels, heroDominance, LAYOUTS } from '../app/src/layouts.js';
import { SAMPLES, sampleById, DEFAULT_COVER_PHOTOS } from '../app/src/cover.js';

const repo = fileURLToPath(new URL('..', import.meta.url));

test('ink: Sobel finds a step edge and ignores flat areas', () => {
  const w = 12, h = 12;
  const gray = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) gray[y * w + x] = x < 6 ? 0 : 255;
  const edges = sobelMagnitude(gray, w, h);
  assert.ok(edges[6 * w + 5] > 100, 'edge at the step is strong');
  assert.ok(edges[6 * w + 6] > 100, 'edge at the step is strong');
  assert.equal(edges[6 * w + 2], 0, 'flat area has no edge');
});

test('ink: dilation grows a single pixel by the radius', () => {
  const mask = new Uint8Array(25);
  mask[12] = 1;
  const out = dilateMask(mask, 5, 5, 1);
  assert.equal(out.filter(Boolean).length, 9, 'radius 1 makes a 3x3 block');
  assert.equal(dilateMask(mask, 5, 5, 0)[12], 1, 'radius 0 is the identity');
});

test('ink: posterize splits 0..255 into 5 bands', () => {
  assert.equal(posterizeBand(0), 0);
  assert.equal(posterizeBand(51), 0);
  assert.equal(posterizeBand(52), 1);
  assert.equal(posterizeBand(153), 2);
  assert.equal(posterizeBand(255), 4);
});

test('ink: halftone is deterministic and off at zero darkness', () => {
  assert.equal(halftoneDot(3, 3, 6, 0), false);
  assert.equal(halftoneDot(3, 3, 6, 1), halftoneDot(3, 3, 6, 1));
  assert.equal(halftoneDot(3, 3, 6, 1), true, 'cell centre is inked at full darkness');
  assert.equal(halftoneDot(0, 0, 6, 1), false, 'cell corner stays paper at full darkness');
});

test('ink: shadow lift brightens dark values, leaves white alone', () => {
  assert.ok(applyLift(30, 1.35) > 30, 'dark value is lifted');
  assert.equal(applyLift(255, 1.35), 255);
  assert.equal(applyLift(0, 1.35), 0);
  assert.equal(applyLift(128, 1), 128, 'lift 1 is the identity');
});

test('framing: the hero crop never cuts the face (boulevard, tall hero panel)', () => {
  const s = sampleById('boulevard');
  const fit = fitPhotoToPanel(544, 720, 500, 570, s.focus, s.safe);
  const sb = { x: s.safe.x * 544, y: s.safe.y * 720, w: s.safe.w * 544, h: s.safe.h * 720 };
  assert.equal(fit.letterboxed, false);
  assert.ok(fit.sx <= sb.x + 0.5, 'safe box left edge inside crop');
  assert.ok(fit.sy <= sb.y + 0.5, 'safe box top edge inside crop');
  assert.ok(fit.sx + fit.sw >= sb.x + sb.w - 0.5, 'safe box right edge inside crop');
  assert.ok(fit.sy + fit.sh >= sb.y + sb.h - 0.5, 'safe box bottom edge inside crop');
});

test('framing: the hero crop never cuts the face (boulevard, wide short panel)', () => {
  const s = sampleById('boulevard');
  const fit = fitPhotoToPanel(544, 720, 1024, 594, s.focus, s.safe);
  // The wide short panel cannot hold the whole head+shoulders safe box, so
  // the contract is the subject (face) box: it must be fully in frame.
  const subj = subjectBox(s.focus, s.safe, 544, 720);
  assert.equal(fit.letterboxed, false, 'wide short panel stays full-bleed');
  assert.ok(fit.sx <= subj.x + 0.5 && fit.sy <= subj.y + 0.5);
  assert.ok(fit.sx + fit.sw >= subj.x + subj.w - 0.5 && fit.sy + fit.sh >= subj.y + subj.h - 0.5);
});

test('framing: a panel too short for the face letterboxes instead of cutting it', () => {
  const s = sampleById('boulevard');
  const fit = fitPhotoToPanel(544, 720, 1024, 200, s.focus, s.safe);
  assert.equal(fit.letterboxed, true, 'impossibly short panel letterboxes');
  // The subject box, mapped through the letterbox draw, lands inside the
  // panel — the photo itself is taller than the panel (it is anchored on
  // the subject), so only the subject rect has to fit.
  const subj = subjectBox(s.focus, s.safe, 544, 720);
  const s2 = fit.dw / 544;
  const sx0 = fit.dx + subj.x * s2;
  const sy0 = fit.dy + subj.y * s2;
  assert.ok(sx0 >= -2 && sy0 >= -2, 'subject top-left inside the panel');
  assert.ok(sx0 + subj.w * s2 <= 1024 + 2 && sy0 + subj.h * s2 <= 200 + 2, 'subject bottom-right inside the panel');
});

test('framing: every sample subject fits its own hero-sized panel', () => {
  for (const s of SAMPLES) {
    const dims = { boulevard: [544, 720], pier: [720, 720], car: [800, 600], neon: [800, 600], skyline: [800, 600], crowd: [800, 600] }[s.id];
    const fit = fitPhotoToPanel(dims[0], dims[1], 500, 570, s.focus, s.safe);
    const subj = subjectBox(s.focus, s.safe, dims[0], dims[1]);
    if (!fit.letterboxed) {
      assert.ok(fit.sx <= subj.x + 0.5 && fit.sy <= subj.y + 0.5, `${s.id}: subject top-left inside`);
      assert.ok(fit.sx + fit.sw >= subj.x + subj.w - 0.5 && fit.sy + fit.sh >= subj.y + subj.h - 0.5, `${s.id}: subject bottom-right inside`);
    }
  }
});

test('grades: five distinct five-tone palettes', () => {
  assert.equal(GRADES.length, 5);
  assert.equal(gradesAreDistinct(), true);
  for (const g of GRADES) {
    assert.equal(g.palette.length, 5);
    assert.ok(new Set(g.palette).size === 5, `${g.id} tones are all different`);
    assert.notEqual(g.ink.toLowerCase(), g.palette[0].toLowerCase(), 'ink differs from the lightest tone');
    assert.equal(gradeById(g.id).id, g.id);
  }
});

test('samples: six photos, five distinct ones in the default cover', () => {
  assert.equal(SAMPLES.length, 6);
  for (const s of SAMPLES) {
    assert.ok(s.focus.x >= 0 && s.focus.x <= 1 && s.focus.y >= 0 && s.focus.y <= 1);
    assert.ok(s.safe.x >= 0 && s.safe.y >= 0 && s.safe.x + s.safe.w <= 1 && s.safe.y + s.safe.h <= 1);
    assert.ok(s.lift >= 1 && s.lift <= 1.5, 'lift stays in the sane range');
  }
  assert.equal(DEFAULT_COVER_PHOTOS.length, 5);
  assert.equal(new Set(DEFAULT_COVER_PHOTOS).size, 5, 'no photo repeats in the cover');
  for (const id of DEFAULT_COVER_PHOTOS) assert.ok(SAMPLES.some((s) => s.id === id));
});

test('layouts: panels stay inside the canvas and never overlap (except tilted)', () => {
  for (const l of LAYOUTS) {
    const panels = layoutPanels(l.id, 1280, 720);
    assert.equal(panels.length, 5, `${l.id} has five panels`);
    for (const p of panels) {
      assert.ok(p.x >= -64 && p.y >= -64, `${l.id} panel inside (loose, tilted rotates)`);
      assert.ok(p.x + p.w <= 1280 + 64 && p.y + p.h <= 720 + 64);
    }
    if (l.id === 'tilted') continue;
    for (let i = 0; i < panels.length; i++) {
      for (let j = i + 1; j < panels.length; j++) {
        const a = panels[i], b = panels[j];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        assert.equal(overlap, false, `${l.id}: panels ${a.role} and ${b.role} overlap`);
      }
    }
  }
});

test('layouts: the hero dominates in hero-led layouts', () => {
  assert.ok(heroDominance('hero', 1280, 720) >= 1.8, 'hero-led hero is 1.8x the median panel');
  assert.ok(heroDominance('portrait', 1024, 1280) >= 1.8, 'portrait hero is 1.8x the median panel');
});

test('dossier: main.ts copies app/ + screenshots/ and writes a valid dossier', () => {
  const out = mkdtempSync(join(tmpdir(), 'palm-heat-dossier-'));
  execFileSync('node', ['main.ts'], { cwd: repo, env: { ...process.env, MAKEFUN_OUTPUT_DIR: out }, stdio: 'pipe' });
  const dossier = join(out, 'dossier.json');
  assert.ok(existsSync(dossier), 'dossier.json exists');
  assert.ok(statSync(dossier).size <= 1572864, 'dossier is at most 1.5 MiB');
  assert.ok(existsSync(join(out, 'app', 'index.html')), 'app/ copied');
  const shots = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.'));
  assert.ok(shots.length >= 3 && shots.length <= 4, '3 or 4 screenshots copied');
  for (const f of shots) assert.ok(statSync(join(out, 'screenshots', f)).size <= 262144, `${f} under 256 KiB`);
});
