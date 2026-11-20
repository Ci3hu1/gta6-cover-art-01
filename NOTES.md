# Leonida Nights Cover Studio — v4 notes

Bounty: `gta6-cover-art-01` — "Make GTA 6 Cover Art". Prize $250, free, escrow USDC.
Closes 21 Nov 2026 10:30 UTC (17:30 WIB). Results 7 Dec 2026.
Entry: "Leonida Nights Cover Studio". Repo: https://github.com/Ci3hu1/gta6-cover-art-01

## v4 top-5 study (fresh, live, 20 Nov 2026 ~12:26–12:30 WIB; 4,697 entries, Judge win rate, all Provisional)

| # | Entrant | Title | Win rate | Live app |
|---|---------|-------|----------|----------|
| 1 | el-net | Palmline | 95.06% (12W 0L) | https://gta6cover-7b2c1395.makefun.sh/ |
| 2 | nightshift-labs | HEATWAVE | 94.81% | https://gta6cover-a74279f4.makefun.sh/ |
| 3 | plntky | Billboard Bay | 94.68% | https://gta6cover-57851a96.makefun.sh/ |
| 4 | limnhere | Neon Harbor | 94.68% | — (judged image + studio screenshot) |
| 5 | regian1117 | Vice Cover Studio v3 | 94.56% | — (judged image + studio screenshot) |

6–10: "Coral Heat" / "SUNSET HEIST v3" / "Sunset State" / "Coastline Cover Studio V5" / "Neon Coast" — all sunset / Vice themed, multi-panel poster makers.

What ALL 5 leaders share (followed in v4):
1. Hero-led multi-panel grid (5–8 panels); one panel clearly the hero, popping OUT of the grid in #4/#5. Every face fully visible and centred. Title may cover bodies, panel joins and cars — NEVER a face.
2. HUGE striped retro-chrome title OVER the art in the lower third + a contrasting pink script sub-line overlapping its corner.
3. COMPLETE magazine furniture: 5-star press-quote band at the top, VOL. pill, gold seal/starburst, tagline ribbon, tiny billing block + barcode along the bottom.
4. Small black role tags on EVERY person panel; #4 adds a second line (location/time).
5. Full studio: named sample photos, 7–10 layouts, 5–8 grades, caption fields, undo/redo, 3-size PNG export.
6. ONE disciplined sunset palette applied to photos, title and frame.

## v3 vs the leaders — gaps v4 closes

- GAP 1 (biggest): v3 had NO magazine furniture. v4 adds all five pieces, every one fully inside the frame in every layout and size.
- GAP 2: v3's title sat across the hero's chin/mouth in 1-cover.jpg. v4 positions the title block bottom-up with the title top fixed at 66% of poster height; the hero face zone ends above 40% in every layout. Regression test asserts non-overlap for all 8 layouts × 5 sizes.
- GAP 3: v3's "pop-out hero" was just a big flush left panel. v4's hero breaks ~2% of width past the grid's left edge and ~1.6% of height past its bottom edge, with a drop shadow.
- GAP 4: v3 had 2–3 faceless landscape panels. v4's 6 bundled samples are ALL people at golden hour (verified by eye, picsum.photos fixed IDs: 64, 1027, 838, 839, 996, 349); default cover uses 5 different people photos, each with a two-line cast tag (role + location/time).
- GAP 5: v3's palette was inconsistent (pale sepia hero, orange pier, dark-brown concert, yellow street, grey-green ocean). v4 grades EVERYTHING with one golden-hour grade (default) plus 5 sibling sunset grades.
- GAP 6: v3 had 4 layouts, straight grids only. v4 has 8 layouts (Pop-Out Cast default, Hero Led, Classic Grid, Portrait, Wide Hero, Slant diagonal cuts, 9-Panel, Duo) + 3 frames (Twilight Gold, Dark, Cream).
- KEPT from v3: clean photographic panels (Poster Ink is an OPTIONAL toggle, default OFF); striped retro-chrome 3D title; Pacifico script sub-line; WANTED badge; 5 stars fully visible with ≥36px clear space below; studio flow; 3-size export; undo/redo; "Surprise me"; auto layout; offline (zero network requests).

## Build log (v4)

- 20 Nov 2026 ~12:42 WIB: builder session started under recording 01a1f779-90aa-705b-a296-16740e0925ef (kit v8, level 27). Sight-unseen rewrite: every file written fresh from the v4 brief.
- Fonts: Anton-Regular.ttf + Pacifico-Regular.ttf (+ OFL texts) downloaded from google/fonts, vendored under app/fonts/.
- Samples: 22 picsum candidates downloaded, each viewed; 6 people photos kept (IDs 64, 1027, 838, 839, 996, 349), downloaded at 1200×900 into app/samples/. Landscapes (waterfall, valley, sea stacks, skyline) and faceless/back-of-head shots rejected.
- Tests: 10 node tests (grades, layouts, title-vs-face × 8 layouts × 5 sizes, stars-in-frame, furniture-in-frame, pop-out bounds, face-aware crop, barcode determinism, default-cover photo diversity) — all pass.
- Screenshots: 4 Playwright shots against `node serve.ts` on :8080 (zero browser network requests): 1-cover.jpg (1280×720, Pop-Out Cast, 5 people photos), 2-editor.jpg (studio), 3-portrait.jpg (1024×1280, Portrait layout), 4-layouts.jpg (all 8 layouts, "NEON DRIVE").
- v3 (commit 3700d491 / recording 01a1f751) is SUPERSEDED — do not submit it.

## Live scores

- v4: not yet submitted — awaiting owner's 'Setuju' on the exact entry.
