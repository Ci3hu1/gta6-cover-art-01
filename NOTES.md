# Palm Heat Cover Studio — build notes (v2.1)

## The live top 10 (studied 19 Nov 2026, 1,557 entries)

Every leader is a multi-panel cover-MAKER tool, not a filter or a template:

| # | Entry | Score |
|---|-------|-------|
| 1 | nightshift-labs — "HEATWAVE Cover Studio" | 929,191 |
| 2 | sunny-kestrel-27 — "Golden Coast Cover Lab" | 920,012 |
| 3 | lomfi — "Neon and sunset multi-panel cover maker" | 905,386 |
| 4 | dany-mardiana — "Vice Press" | 884,126 |
| 5 | crisp-coyote-57 — "Neon Grid Cover Studio: 5-panel, 4 grades, 3 layouts, bold lettering" | 880,371 |
| 6–8 | Neon Shore / Neon Palms / Neon Coast Cover Studio | ~874,000 |
| 9 | udines — "Vice Collage — five-panel GTA-style, sunset + neon grading" | 870,642 |
| 10 | cosmic — "Solstice Studio" | 868,657 |

All leaders' source is withheld (titles + scores only), so this study is
from what is visible: multi-panel grids, several grades, several layouts,
bold lettering. v2 follows that method and adds the one thing the titles
cannot show — a real inked look.

## Stephen Bliss research (Rockstar's GTA cover artist, 2001–2016)

- Comic grid with varied panel sizes; hero panel top-left (GTA 6 keeps the
  helicopter top-left).
- Thick BLACK ink outlines + cell-shading with gritty realistic weight.
- Halftone dots in shadows.
- Limited bold palette, high contrast.
- 1950s pulp + comic book + high-fashion illustration hybrid.
- Hidden signature details in panels (street names, brand logos).
- "Whatever I do has to create an emotional connection" — the poster tells
  a story.
- General cover principles followed: Hero + Logo = Box Art; rule of thirds
  for focal points; foreground/midground/background depth; strong
  silhouette; one consistent design system across layouts.

## What v1 got wrong (user: "kurang bagus")

- Same 2 photos repeated across panels.
- Flat orange duotone, no ink, no halftone.
- Weak title outline.
- Uniform panels, no hierarchy.
- No story details.

## What v2 changed

1. **Comic-ink render pipeline** (`app/src/cover.js`): Sobel edge detect
   with 3×3 dilation for thick black outlines, posterize to 5 tones,
   Bayer halftone in the two darkest tones, paper grain, then a 5-step
   grade palette map — applied per panel before the grade. The posters
   read as inked/hand-drawn, not filtered photos.
2. **Six distinct bundled photos, never repeated in one poster.** The two
   kit samples (`boulevard.jpg`, `pier.jpg`) plus four picsum downloads
   with fixed seeds: `car.jpg` (vicecar), `skyline.jpg` (leonida),
   `crowd.jpg` (beachcrowd), `neon.jpg` (neonstreet). Default preset uses
   5 different photos, one per panel.
3. **Hero-led grid** (`app/src/layouts.js`): hero 2× top-left, supporting
   panels varied; 5 layouts (Hero-led, Classic Grid, Portrait, Wide,
   Tilted Snapshots).
4. **Title block**: Anton, white-to-gold gradient, ~8 px black stroke
   (paint-order: stroke), hard offset shadow; Pacifico neon subtitle;
   WANTED badge; 5-star heat meter; story details drawn into panels
   ("OCEAN DR" street sign, "LEONIDA" plate).
5. **Five truly distinct grades** (`app/src/grades.js`): Vice Sunset,
   Neon Night, Golden Coast, Noir Ink, Teal Pink — each sets ink colour,
   palette, halftone density, shadow lift and grain.
6. Kept from v1: fully offline (verified: 16 browser requests, all
   localhost, zero external), PNG export 1080×1080 / 1080×1350 /
   1920×1080, per-panel crop/position + photo assignment, undo/redo,
   grain + vignette.

## v2.1 fixes (owner: "Perbaiki dulu")

1. **Hero face cropped** — face-safe crop: focal points sit on the face
   (boulevard fy 0.18, pier fy 0.20) and the crop window is never allowed
   to start below a face in the upper part of a photo. Verified visually:
   the hero's full face (eyes, nose, mouth, head + shoulders) is visible
   in `screenshots/1-cover.jpg` and `screenshots/3-portrait.jpg`.
2. **Dark panel unreadable** — per-photo shadow lift (car 0.20, crowd
   0.12, neon 0.08) raises the darkest posterize band; the camera and
   mountain panels now read at a glance.
3. **Empty panel** — the skyline photo is cropped with zoom 1.35 on the
   horizon band (fy 0.72) instead of the empty sky, so all five cover
   photos read as distinct scenes.

Polish found while verifying the screenshots: title shrunk to 0.115×H so
the 5-star row is never clipped; the LEONIDA plate moved to the
bottom-right of the car panel so it clears both the title and the stars.

## Build log (19 Nov 2026, fresh recorded session)

- Fonts downloaded from google/fonts: Anton-Regular.ttf,
  Pacifico-Regular.ttf (+ OFL texts) into `app/fonts/`.
- 4 picsum photos downloaded with the fixed seeds above.
- Every file rewritten fresh from the brief (README, NOTES, STRATEGY,
  main.ts, serve.ts, app/, tests/, shots.json).
- `node tests/run.mjs` — 17/17 pass (face-safe crops, posterize bands,
  shadow lift, Sobel, halftone, grades, layouts).
- Screenshots via headless Chromium against `node serve.ts` on :8080,
  waiting on `window.__shotReady`: 1-cover.jpg (1280×720, wide,
  PALM HEAT), 2-editor.jpg (1280×800, editor), 3-portrait.jpg
  (1024×1280, portrait), 4-layouts.jpg (1280×720, NEON DRIVE overview).
  All four ≤ 256 KiB.
- `MAKEFUN_OUTPUT_DIR=/tmp/out-test node main.ts` — dossier builds,
  1,057,451 bytes (cap 1.5 MiB).
- Offline check: 16 browser requests, all localhost, zero external.
- One bug found and fixed during the build: `runShot` passed the shot
  name instead of the query to `runEditor` (`query.get is not a function`);
  fixed and re-shot.
