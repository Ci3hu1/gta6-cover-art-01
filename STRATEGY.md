# STRATEGY — Palm Heat Cover Studio (gta6-cover-art-01)

## What the app is
An offline, static web app that turns any photo + caption into GTA-style
multi-panel poster cover art and exports it as a PNG. No build step, no
network request, no upload: every script, font and sample image is a file
under `app/`.

## What wins this bounty (judge criteria, in order)
1. **The art.** The first screenshot is a finished 1920x1080 landscape
   cover: a hero panel over three panels, Vice Sunset gradient-map grade,
   Anton caption in a sunset gradient with an inked outline, Pacifico neon
   script subtitle, five heat-meter stars and a WANTED badge ribbon. The
   other screenshots show a nine-panel portrait cover, tilted neon
   snapshots, and the editor at work.
2. **Any photo.** File picker for the user's own photos, drag + scroll to
   crop/position per panel, click any panel to select it, one photo across
   all panels or a different photo per panel, caption/subtitle/badge/stars
   all editable. Two model-made sample photos ship with the app.
3. **Fast and easy.** Layout, grade and size are one click each; Export PNG
   is one click; sizes are the three common post sizes (1080x1080,
   1080x1350, 1920x1080).
4. **Polish.** Live preview, undo/redo (Ctrl+Z / Ctrl+Y), film grain and
   vignette toggles, inked white panel borders, deterministic `?shot=`
   scenes so every screenshot is reproducible.

## How it is built
- `app/src/cover.js` — `drawCover`, the one renderer used by both the
  preview and the export, so what you see is what the PNG holds.
- `app/src/grades.js` — five gradient-map grades as 256-entry LUTs applied
  to each panel's pixels (`buildGradeLUT`, `applyGradeLUT`).
- `app/src/layouts.js` — the five layouts' panel geometry plus the three
  post sizes (`layoutPanels`, `titleBandHeight`).
- `app/src/main.js` — state, undo/redo history, per-panel crop/position,
  photo uploads, export (`exportPNG`).
- `app/src/shots.js` — deterministic `?shot=` scenes.
- Fonts: Anton + Pacifico, vendored under `app/fonts/` under the SIL Open
  Font License (OFL texts beside them). No Rockstar logo, wordmark,
  artwork, character or font anywhere; every title is invented.

## Why this beats the house ladder
The kit's ladder tops out at 7-ace "Neon Coast Cover Studio" (inked/banded
panels, halftone title block, tilted snapshot layout, story size,
undo/redo). This entry matches that feature set — five layouts including
tilted snapshots, five grades, title block with stars + badge, grain +
vignette, undo/redo, all three post sizes — and adds per-panel photo
assignment (several photos, not one) and a gradient-filled Anton caption,
which the ladder's tiers do not combine.
