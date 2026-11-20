# Leonida Nights Cover Studio v3 — build notes

## What v3 is
A fresh sight-unseen rebuild of the gta6-cover-art-01 entry ("Leonida Nights
Cover Studio"). v2.1 ("Palm Heat") was rejected by the owner — the heavy
comic-ink pipeline (Sobel edges → thick outlines → posterize → halftone)
muddied faces ("makin jelek"). v3 drops that pipeline entirely: photos stay
clean and photographic with only gentle sunset/Vice colour grades.

## Top-10 study (live, 20 Nov 2026 ~11:45 WIB; 4,555 entries; scores not yet assigned)

| # | Title | Win rate | What it does |
|---|-------|----------|--------------|
| 1 | Palmline / "Sunreel" (el-net) | 95.06% (12W 0D 0L) | Full studio: 3 steps (Add photos → Caption → Export PNG), smart face-aware crops, auto layout, "Surprise me", 3-size export |
| 2 | HEATWAVE (nightshift-labs) | — | Title over the art, slanted panels, sunset grade, sky glow, per-panel crop, PNG 3 sizes |
| 3 | Billboard Bay (plntky) | — | Movie-poster key art, pop-out hero cut-out, face-aware crops, auto cast tags, 3 post sizes |
| 4 | Neon Harbor (limnhere) | — | 7-panel pop-out hero, striped retro-chrome titles, cast role tags, 8 Vice grades, 3-size PNG export |
| 5 | Vice Cover Studio v3 (regian1117) | — | Twilight Gold Frame, retro-chrome 3D titles, role tags, 8 layouts, 6 grades, 3-size PNG export |
| 6–10 | Coral Heat / SUNSET HEIST v3 / Sunset State / Neon Coast / VICE STATE | — | All sunset/Vice themed multi-panel poster makers |

All leaders' source is withheld; only titles, win rates and live-app behaviour
were visible. The pattern is unanimous: clean-photo poster STUDIOS with
pop-out heroes, chrome titles over the art, role tags and 3-size export.

## Official GTA 6 cover (Rockstar, 18 Jun 2026)
Nine-panel collage around the central GTA VI logo — the classic GTA cover
tradition. Jason Duval and Lucia Caminos share the top-middle panel, both
armed, palms and sunset behind them. Pink/purple/orange sunset palette,
palms + neon. Other panels: helicopter over the skyline, motorcycle wheelie,
Boobie Ike, flamingo over a speedboat, a gator, Raul Bautista, a yellow
scissor-door sports car, a woman with sunglasses and a drink by a pool.
Bright, crowded, restless — a mood board, not a mission list.

## What was followed
- Clean photographic panels + gentle grades only (no posterize/halftone/ink).
- Hero pop-out cut-out overlapping panel borders ~24px, face-aware crop
  anchored on the upper third so the head + shoulders stay fully in frame.
- Striped retro-chrome 3D title OVER the art with a scrim, Pacifico neon
  subtitle, WANTED badge, 5-star heat meter.
- Cast role tags per panel + story details (OCEAN DR street sign, LEONIDA
  plate) drawn into panels.
- Full studio flow: 1 Add photos → 2 Caption → 3 Export PNG (3 sizes),
  per-panel pan/zoom/flip/swap, undo/redo, auto layout, "Surprise me",
  grain + vignette toggles.
- Six grades: Vice Sunset, Neon Night, Golden Coast, Twilight Gold,
  Teal Pink, Noir. Six layouts: Hero Led, Classic Grid, Portrait,
  Wide Hero, Slanted, Nine Panel.
- Six fresh picsum sample photos, picked by content (the brief's first six
  seeds returned landscapes with no faces — stone steps, a yellow wall,
  bamboo — so the set was re-picked from picsum IDs/seeds whose content fits:
  hero = picsum id 1027, a woman's full face; sunset = seed "miami", sunset
  pier with people; neon = id 453, live stage spotlights; palms = seed
  "couple", golden sunset street; ocean = id 1053, ocean waves; strip =
  id 64, woman with sunglasses at golden hour). Default cover uses 5
  different ones.

## Star fix (carried from the 20 Nov owner report)
The 5 gold stars under the title are placed bottom-up: the title block is
computed from the frame's bottom edge, leaving >= 36px of clear space below
the stars in every layout and every export size. Verified in 1-cover.jpg
and 3-portrait.jpg and by the Node test (`titleBlockGeometry`).

## Build log (20 Nov 2026)
- Fresh kit v7 downloaded; guide 1.5.225; competition strict_transcripts.
- Recorder started by the parent session (recording 01a1f751-389a-72e7-8bdb-24c7bddac3fb).
- Fonts Anton + Pacifico (OFL) downloaded from google/fonts; 6 picsum photos
  downloaded with fixed seeds (800×600).
- All files written fresh from the v3 brief (sight-unseen rebuild).
- Tests: `node --test tests/cover.test.mjs` — 8/8 pass.
- Screenshots: Playwright against `node serve.ts` on :8080; 4 shots in
  screenshots/ (see shots.json). Verified: clean photos, pop-out hero,
  chrome title, stars fully visible with clear space below.
- Superseded: v2.1 commit 754c9776 / recording 01a1f730 — do NOT submit.
- Status: NOT submitted; awaiting the owner's explicit 'Setuju' on the
  exact entry (commit + recording + kit check, reported by the parent run).

## Live scores
- v3: not yet submitted (awaiting 'Setuju').
