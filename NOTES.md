# NOTES — top-10 study, art research and build log (gta6-cover-art-01)

## Top-10 study (19 Nov 2026 ~20:03 WIB, 1,557 entries)
Live leaderboard at study time:

1. nightshift-labs — 929,191 — "HEATWAVE Cover Studio: your photos into multi-panel key-art posters, 4 layouts, 4 gradient…"
2. sunny-kestrel-27 — 920,012 — "Golden Coast Cover Lab"
3. lomfi — 905,386 — "Neon and sunset multi-panel cover maker"
4. dany-mardiana — 884,126 — "Vice Press"
5. crisp-coyote-57 — 880,371 — "Neon Grid Cover Studio: 5-panel multi-photo covers, 4 colour grades, 3 layouts, bold lette…"
6. fariz-bee — 874,570 — "Neon Shore Cover Studio"
7. lucky-coyote-98 — 874,570 — "Neon Palms Cover Studio"
8. helboys — 872,613 — "Neon Coast Cover Studio"
9. udines — 870,642 — "Vice Collage — five-panel GTA-style cover art maker with sunset and neon grading"
10. cosmic — 868,657 — "Solstice Studio"

## What the pattern says
Every leader is a "Cover Studio / Cover Maker" web app: a multi-panel poster
cover maker with PNG export, named around Vice City / neon / sunset. The common
thread is multi-panel + several grades + several layouts + bold lettering.
The leaders' source is withheld: no repo, README or method could be read.
Nothing about their implementation is claimed here — the study rests on titles
+ live scores only, plus the kit's own ladder (competition.yaml), which is
public and specific: 4-strong "Panel Press" (four-panel grid, hero-and-three +
full-bleed layouts, gradient-map grades, Anton lettering); 5-pro "Sunset
Sleeve" (six layouts, five grades, sunset-gradient lettering + neon script
subtitle, grain + vignette); 6-elite "Palm Poster Lab" (nine-panel grid +
title block, heat-meter stars + badge ribbon, every size at once); 7-ace
"Neon Coast Cover Studio" (inked/banded panels, halftone title block, tilted
snapshot layout, story size, undo/redo). This entry aims at the 7-ace set.

## Art research — Stephen Bliss and the GTA look
Stephen Bliss (Rockstar artist 2001–2016) defined the series' cover style:
a comic-book grid of varied panels with a hero panel top-left (GTA 6 keeps
the helicopter there); thick BLACK ink outlines with cell-shading that has
gritty realistic weight — "People often think it's just a Photoshop filter.
It's not. Everything is hand-drawn."; halftone dots in the shadows; a limited
bold palette at high contrast; a hybrid of 1950s pulp, comic books and
high-fashion illustration; small hidden signature details in the panels
(street names, brand logos); and, in his own words, "whatever I do has to
create an emotional connection" — the poster tells a story. General cover
rules applied too: Hero + Logo = Box Art; rule of thirds; foreground /
midground / background depth; a strong silhouette; one design system across
every layout.

## What we followed
- A real comic-ink pipeline in canvas pixel code (app/src/ink.js): Sobel edge
  detect → dilated thick black outlines → posterize to 5 tones → halftone dot
  screen in the dark tones → seeded paper grain, applied per panel BEFORE the
  grade. Not a duotone filter.
- Hero-led grid: the hero panel is TALL (39% of the width, full height) and
  at least 1.8x the median panel, so the lead face always has room.
- Five truly distinct grades (app/src/grades.js): Vice Sunset, Neon Night,
  Golden Coast, Noir Ink, Teal Pink — each its own 5-tone palette, ink colour,
  halftone density and glow.
- Pricedown-style title: Anton, white-to-gold gradient, ~8px black stroke,
  hard offset shadow; Pacifico neon subtitle; five-star heat meter; WANTED
  badge; story details drawn into the panels ("OCEAN DR" street sign,
  "LEONIDA" plate).
- Six distinct sample photos, five different ones in every default cover;
  per-panel photo assignment, drag to reframe, scroll to zoom, undo/redo,
  PNG export in 1080 x 1080, 1080 x 1350 and 1920 x 1080, fully offline.

## v2.1 framing fixes (20:17 WIB — owner's order "Perbaiki dulu")
The v2 build (commit b24778f) had the style right but three framing defects
in its screenshots. All three are fixed here, and the fix is enforced by
code + tests, not by eyeballing once:
1. **Hero face cropped.** v2's wide short hero panel cut the woman's face
   (chin/neck only). Root cause: centre-crop on a wide panel. Fix: every
   sample photo now carries a measured focus point + a "safe box" (head +
   shoulders, measured from the real photo). fitPhotoToPanel() centres the
   crop on the focus and guarantees the SUBJECT box — the face itself, the
   middle ~45% of the safe box — is always fully in frame; the whole safe
   box is included whenever it fits the panel. A wide short panel therefore
   shows the face full-bleed (shoulders may crop) instead of shrinking the
   photo into a strip with empty sides, and only when the subject itself is
   bigger than the panel does the photo letterbox, anchored on the subject's
   centre. The hero panel is tall in every layout. Tests assert the subject
   box stays fully inside the crop for every sample, and that an impossibly
   short panel letterboxes.
2. **Dark panel unreadable.** The camera-person photo (mostly black sweater)
   crushed to black. Fix: per-photo shadow lift (gamma) — car 1.35, crowd
   1.3 — applied before posterizing, so the darkest band stays a readable
   dark tone instead of pure black.
3. **Empty skyline panel.** The foggy-sunset photo is mostly empty mist; its
   only colour is the pink cloud band at the top. Fix: its focus + safe box
   anchor the cloud band (y 0.05..0.40), and the Sunset Strip layout gives
   wide empty photos a proper wide strip to breathe in.
Focus/safe values were measured by viewing each photo: boulevard face
(0.55, 0.22), pier face (0.42, 0.25), car hands+camera (0.50, 0.45),
neon ridge+hikers (0.35, 0.45), skyline cloud band (0.50, 0.22), crowd
figure+trees (0.50, 0.42).

## Build log (v2.1)
- Fresh kit downloaded to gta6-cover-art-01-kit-v3/ (level 20); kit's
  competition.yaml + starter read for the entry contract. Recorder already
  running for this competition; this session began after the recording
  started, so the work is witnessed. No transcript or usage record edited.
- Every repo file rewritten fresh in this session from the v2 brief + the
  v2.1 fixes (sight-unseen: no v2 file was read). Fonts downloaded this
  session from google/fonts: Anton-Regular.ttf and Pacifico-Regular.ttf with
  their OFL.txt licence files, into app/fonts/. Four extra sample photos
  downloaded this session from picsum.photos with fixed seeds (vicecar,
  leonida, beachcrowd, neonstreet) into app/samples/.
- Screenshots taken with Playwright against `node serve.ts` on localhost:8080;
  the app made zero network requests in the browser. Each screenshot was
  viewed before committing: the hero's full face is visible in 1-cover.jpg
  and 3-portrait.jpg, no panel is unreadably dark, no panel is empty.
  Second framing pass: the first layouts sheet showed the boulevard photo
  shrinking into a narrow strip in wide short panels (cream edges at the
  sides), so fitPhotoToPanel() now guarantees the SUBJECT box (face) and
  keeps wide short panels full-bleed; the tilted mini read as a cream block
  at that size, so the fifth cell is now the same hero in Neon Night instead
  — it also proves the grades are genuinely different.
- Tests: `node tests/run.mjs` (ink math, face-safe framing, grades, layouts,
  dossier build). Kit check: `node cli/makefun.mjs check --worktree` from
  the fresh kit.
