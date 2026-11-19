// Test for the entry program (main.ts): it copies app/ + screenshots/ to
// the output dir and writes a valid dossier.json. Needs screenshots/ to
// exist first (run after the screenshot step).
// Run: node tests/run.mjs
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repo = fileURLToPath(new URL('..', import.meta.url));

export function testDossier() {
  const shotsDir = join(repo, 'screenshots');
  assert.ok(existsSync(shotsDir), 'screenshots/ must exist before this test');
  const shots = readdirSync(shotsDir).filter((f) => !f.startsWith('.'));
  assert.ok(shots.length >= 3 && shots.length <= 4, `expect 3-4 screenshots, got ${shots.length}`);
  for (const f of shots) {
    const bytes = statSync(join(shotsDir, f)).size;
    assert.ok(bytes <= 262144, `${f} must be <= 256 KiB, got ${bytes}`);
    assert.ok(bytes > 10000, `${f} looks too small to be a real screenshot`);
  }

  const out = mkdtempSync(join(tmpdir(), 'palm-heat-out-'));
  execFileSync('node', ['main.ts'], {
    cwd: repo,
    env: { ...process.env, MAKEFUN_OUTPUT_DIR: out },
    stdio: 'pipe',
  });
  assert.ok(existsSync(join(out, 'app', 'index.html')), 'app/index.html must be copied');
  assert.ok(existsSync(join(out, 'app', 'src', 'cover.js')), 'app/src/cover.js must be copied');
  assert.ok(existsSync(join(out, 'app', 'fonts', 'Anton-Regular.ttf')), 'fonts must be copied');
  assert.ok(existsSync(join(out, 'screenshots', shots[0])), 'screenshots must be copied');
  const dossierPath = join(out, 'dossier.json');
  assert.ok(existsSync(dossierPath), 'dossier.json must be written');
  const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
  assert.ok(dossier, 'dossier.json must parse');
  assert.ok(statSync(dossierPath).size <= 1572864, 'dossier.json must be <= 1.5 MiB');
}
