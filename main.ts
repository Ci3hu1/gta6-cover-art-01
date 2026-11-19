// Palm Heat Cover Studio v2.1 — entry program (Node 22+, standard library only).
// Hands the app in: it copies app/ and screenshots/ from beside this file to
// /output (or $MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun
// library. It validates the required pieces first — the app files, 3 or 4
// screenshots each under 256 KiB — and logs what it handed in.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const required = [
  'app/index.html',
  'app/style.css',
  'app/src/cover.js',
  'app/src/grades.js',
  'app/src/ink.js',
  'app/src/layouts.js',
  'app/src/main.js',
  'app/src/shots.js',
  'shots.json',
];
for (const rel of required) {
  if (!existsSync(join(here, rel))) throw new Error(`missing required file: ${rel}`);
}

const shots = readdirSync(join(here, 'screenshots')).filter((f) => !f.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots: need 3 or 4, found ${shots.length}`);
}
for (const f of shots) {
  const bytes = statSync(join(here, 'screenshots', f)).size;
  if (bytes > 262144) throw new Error(`screenshot over 256 KiB: ${f} (${bytes} bytes)`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse.
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

console.log(`Palm Heat v2.1 ready: ${shots.length} screenshots, dossier written to ${out}/dossier.json`);
