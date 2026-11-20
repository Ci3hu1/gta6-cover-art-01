// Leonida Nights Cover Studio v4 — entry program (Node 22, stdlib only).
// Hands the app in: copies app/ and screenshots/ from beside this file to
// /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the kit's vendored make.fun library.
// Run it:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');

// Validate the hand-in before writing anything: the app entry point, the
// fonts, the sample photos and the screenshots must all be present.
const required = [
  join(appDir, 'index.html'),
  join(appDir, 'style.css'),
  join(appDir, 'src', 'cover.js'),
  join(appDir, 'src', 'grades.js'),
  join(appDir, 'src', 'layouts.js'),
  join(appDir, 'src', 'main.js'),
  join(appDir, 'src', 'shots.js'),
  join(appDir, 'fonts', 'Anton-Regular.ttf'),
  join(appDir, 'fonts', 'Pacifico-Regular.ttf'),
  join(appDir, 'samples', 'hero-sunglasses.jpg'),
  join(appDir, 'samples', 'portrait-red-lips.jpg'),
  join(appDir, 'samples', 'street-mother.jpg'),
  join(appDir, 'samples', 'sunset-rider.jpg'),
  join(appDir, 'samples', 'golden-profile.jpg'),
  join(appDir, 'samples', 'pier-sitter.jpg'),
];
for (const f of required) {
  if (!existsSync(f)) throw new Error(`missing required file: ${f}`);
}

const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((n) => !n.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
}
for (const n of shots) {
  const size = statSync(join(shotsDir, n)).size;
  if (size > 262144) throw new Error(`screenshot over 256 KiB: ${n}`);
}

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Leonida Nights Cover Studio v4 ready: ${shots.length} screenshots, dossier written to ${out}/dossier.json`);
