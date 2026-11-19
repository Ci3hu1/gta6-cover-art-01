// Palm Heat Cover Studio — a gta6-cover-art-01 entry (Node 22, standard library only).
// Written in the recorded build session: the app is this directory's app/ folder, plain static
// files a desktop browser loads offline (app/index.html and its ES modules, Anton + Pacifico
// vendored under the OFL, no library and no network request), and this program hands it in. It
// copies app/ and screenshots/ from beside this file to /output and writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library. The app itself is a
// multi-panel GTA-style cover maker: five layouts, five gradient-map grades, Anton caption +
// Pacifico neon subtitle, heat-meter stars and a badge ribbon, per-panel crop/position, undo/redo,
// and one-click PNG export in 1080x1080, 1080x1350 and 1920x1080.
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Palm Heat validation (builder's own step): refuse to hand in an entry with no
// cover screenshot or no app entry point, and log what was handed in.
const shotNames = readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.')).sort();
if (shotNames.length < 3 || shotNames.length > 4) throw new Error(`expected 3-4 screenshots, found ${shotNames.length}`);
if (!existsSync(join(out, 'app', 'index.html'))) throw new Error('app/index.html missing from output');
const shotBytes = shotNames.reduce((sum, n) => sum + statSync(join(out, 'screenshots', n)).size, 0);
console.log(`Palm Heat Cover Studio: ${shotNames.length} screenshots (${shotBytes} bytes), cover ${shotNames[0]}`);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
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
