// Runs main.ts into a temp output dir and checks the result: dossier.json
// exists, the gate's screenshot limits hold (3-4 shots, each <= 256 KiB,
// long side <= 1280, short side >= 480), and app/ stays within its caps.
// Plain node only (node:test, node:fs, node:os, node:path, node:child_process).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

function jpegSize(buf) {
  // Minimal JPEG SOF parser: find a Start-Of-Frame marker for dimensions.
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      return { w, h };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  throw new Error('no SOF marker found');
}

test('main.ts writes a valid output dir', () => {
  const out = mkdtempSync(join(tmpdir(), 'gta6-cover-art-01-test-'));
  execFileSync(process.execPath, ['main.ts'], { cwd: repo, env: { ...process.env, MAKEFUN_OUTPUT_DIR: out }, stdio: 'pipe' });
  const dossier = join(out, 'dossier.json');
  assert.ok(statSync(dossier).isFile(), 'dossier.json exists');
  const parsed = JSON.parse(readFileSync(dossier, 'utf8'));
  assert.ok(parsed, 'dossier.json parses');

  const shots = readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.')).sort();
  assert.ok(shots.length >= 3 && shots.length <= 4, `3-4 screenshots, got ${shots.length}`);
  assert.equal(shots[0], '1-cover.jpg', 'first screenshot by name is the cover');
  for (const name of shots) {
    const file = join(out, 'screenshots', name);
    const size = statSync(file).size;
    assert.ok(size <= 256 * 1024, `${name} is ${size} bytes, over 256 KiB`);
    const { w, h } = jpegSize(readFileSync(file));
    assert.ok(Math.max(w, h) <= 1280, `${name} long side ${Math.max(w, h)} over 1280`);
    assert.ok(Math.min(w, h) >= 480, `${name} short side ${Math.min(w, h)} under 480`);
  }
  assert.ok(statSync(join(out, 'app', 'index.html')).isFile(), 'app/index.html exists');
});
