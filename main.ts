// main.ts — the entry program for gta6-cover-art-01 (Node 22, standard
// library only). It hands the app in: it checks the entry's required files
// exist, copies app/ and screenshots/ from this repository to /output, and
// writes /output/dossier.json with buildDossier from vendor/makefun-app.ts,
// the kit's library, unchanged. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The files the entry must carry. A missing one is a build error, not a
// silent gap in the dossier.
const required = [
  'app/index.html',
  'app/style.css',
  'app/src/cover.js',
  'app/src/grades.js',
  'app/src/layouts.js',
  'app/src/main.js',
  'app/src/shots.js',
  'app/fonts/Anton-Regular.ttf',
  'app/fonts/Pacifico-Regular.ttf',
  'app/fonts/OFL.txt',
  'app/samples/boulevard.jpg',
  'app/samples/pier.jpg',
  'app/samples/car.jpg',
  'app/samples/skyline.jpg',
  'app/samples/crowd.jpg',
  'app/samples/neon.jpg',
  'shots.json',
];
const missing = required.filter((rel) => !existsSync(join(here, rel)));
if (missing.length > 0) {
  console.error(`missing required files: ${missing.join(', ')}`);
  process.exit(1);
}
const shots = readdirSync(join(here, 'screenshots')).filter((f) => !f.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  console.error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
  process.exit(1);
}
for (const f of shots) {
  const bytes = statSync(join(here, 'screenshots', f)).size;
  if (bytes > 262144) {
    console.error(`screenshot ${f} is ${bytes} bytes, over the 256 KiB cap`);
    process.exit(1);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB
// of app files, in all, or a path under app/ over 1000 bytes).
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

console.log(`Palm Heat Cover Studio ready: ${shots.length} screenshots, dossier written to ${out}/dossier.json`);
