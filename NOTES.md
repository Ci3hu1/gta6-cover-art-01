# Palm Heat Cover Studio — Notes

## v2 top-10 study (19 Nov 2026)

Live top 10 of gta6-cover-art-01 (1,557 entries) — every leader is a
multi-panel cover-MAKER tool:

| # | Entry | Score |
|---|-------|-------|
| 1 | nightshift-labs "HEATWAVE Cover Studio" — 4 layouts, 4 gradients | 929,191 |
| 2 | sunny-kestrel-27 "Golden Coast Cover Lab" | 920,012 |
| 3 | lomfi "Neon and sunset multi-panel cover maker" | 905,386 |
| 4 | dany-mardiana "Vice Press" | 884,126 |
| 5 | crisp-coyote-57 "Neon Grid Cover Studio: 5-panel, 4 grades, 3 layouts, bold lettering" | 880,371 |
| 6–8 | Neon Shore / Neon Palms / Neon Coast Cover Studio | ~874,000 |
| 9 | udines "Vice Collage — five-panel GTA-style, sunset + neon grading" | 870,642 |
| 10 | cosmic "Solstice Studio" | 868,657 |

Leaders' source is withheld (titles + scores only). v1 matched their
feature list but lost on VISUAL quality ("kurang bagus").

## Stephen Bliss research (Rockstar artist, defined the GTA look 2001–2016)

- Comic grid, varied panel sizes, hero panel top-left (GTA 6 keeps the helicopter top-left).
- Thick BLACK ink outlines + cell-shading with gritty realistic weight — "People often think it's just a Photoshop filter. It's not. Everything is hand-drawn."
- Halftone dots in shadows; limited bold palette, high contrast.
- 1950s pulp + comic book + high-fashion illustration hybrid.
- Hidden signature details in panels (street names, brand logos).
- "Whatever I do has to create an emotional connection" — the poster tells a story.

General cover principles followed: Hero + Logo = Box Art; rule of thirds;
foreground/midground/background depth; strong silhouette; one consistent
design system across layouts.

## What was followed

- Comic-ink render pipeline in canvas pixel code (Sobel → thick ink outlines → posterize to 5 tones → halftone in shadows → paper grain), applied per-panel before the grade.
- Six distinct bundled sample photos (picsum.photos fixed seeds, CC0-style placeholder photos — no real people, no GTA artwork), never repeated in one poster; default cover uses 5 different photos.
- Hero-led grid (hero 2× size, top-left) + Classic Grid, Portrait, Wide and a tilted-snapshot variant.
- Title block: Anton, white-to-gold gradient, ~8px black stroke, hard offset drop shadow; Pacifico neon-script subtitle; WANTED badge; 5-star heat meter; story details (OCEAN DR sign, LEONIDA plate).
- Five truly distinct grades, each with its own ink, palette, halftone density and glow.
- Fully offline (zero browser network requests), PNG export 1080×1080 / 1080×1350 / 1920×1080, per-panel crop/position + photo assignment, undo/redo, grain + vignette.

## v2.1 fixes (owner's order, 20 Nov 2026)

1. Hero face cropped — fixed by focus-anchored crops: the hero panel's focus sits in the upper part of its photo (fy 0.30) so the head + shoulders stay fully in frame. Verified visually in 1-cover.jpg and 3-portrait.jpg.
2. Dark panel unreadable — fixed by lifting the darkest posterize band (per-grade shadowLift ≥ 0.14) and raising the ink threshold in dark areas so outlines thin out instead of swallowing shadow detail.
3. Empty skyline panel — fixed by cropping deep into the busy lower part of the skyline photo (fy 0.78, zoom 1.7); the photo is mostly empty sky above the horizon, so a shallow crop read as an empty gradient.

## v2.1 fix rebuild (20 Nov 2026 — stars cut off)

Owner spotted in the 1-cover.jpg screenshot: the 5 gold stars under "PALM HEAT" were cut off by the bottom edge — only their top halves showed; in 3-portrait.jpg they were tight against the bottom edge. Fix: the title block is now laid out bottom-up from the frame edge (`titleBlock()` in `app/src/layouts.js`): the stars sit at an explicit bottom margin (≥36px, 4.5% of height) above the edge, subtitle above the stars, title above the subtitle. A regression test (`tests/run.mjs`, "THE STARS FIX") asserts for every layout and every export size that all 5 stars are fully inside the frame with ≥36px of clear space below them. Verified visually in 1-cover.jpg and 3-portrait.jpg.

## Build log

- v1: multi-panel cover maker, flat orange duotone, weak title outline.
- v2 (commit b24778f): comic-ink pipeline, hero grid, 5 grades, 6 photos.
- v2.1 (commit 2cc8910): hero face crop fix, dark-panel lift, busier skyline panel. Round 1 submitted 19 Nov, rejected — only transcripts_witnessed failed.
- v2.1 rebuild (commit 4f341ed, recording 01a1f70c, sealed 04:03:17Z 20 Nov): clean-recording rebuild; owner approved submitting, then spotted the cropped stars ("Tunggu").
- v2.1 fix rebuild (this commit): stars fully in frame; everything else unchanged.

## Running & testing

```sh
node serve.ts          # http://localhost:8080
node tests/run.mjs     # pure-logic tests (grades, layouts, title geometry, ink math)
```
