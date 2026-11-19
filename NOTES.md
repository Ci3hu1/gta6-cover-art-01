# NOTES — top-10 study and build log (gta6-cover-art-01)

## Top-10 study (19 Nov 2026 ~17:57 WIB, 11 judged entries, ~25 min after opening)
Live leaderboard at study time:

1. rifkisetiawan — 793,279 — "Leonida Heat — Cover Studio"
2. nazwakhoerina — 720,080 — "Neon Grid Cover Studio — multi-panel poster cover maker (offline, PNG export)"
3. siriusjack — 698,966 — "Vice Cover Maker — GTA 6-style multi-panel cover art"
4. mdhossinbd — 688,225 — "Vice Cover Maker — GTA 6-style cover art maker"
5. tao-shuang — 683,443 — "Vice City Cover Studio"
6. riza1202 — 682,099 — "ViceFrame — Neon Vice Cover Studio"
7. riswan-di — 680,293 — "Neon Coast"
8. qynb6666m-ops — 670,745 — "Vice Cover Studio"
9. ambilsemua — 667,531 — "Vice Cover — GTA 6-style multi-panel cover maker"
10. daring-heron-75 — 618,729 — "Daring Heron sunset cover studio"

## What the pattern says
Every leader is a "Cover Studio / Cover Maker" web app: a multi-panel
poster cover maker with PNG export, named around Vice City / neon /
sunset. The common thread in the titles is multi-panel + export + a
sunset-or-neon grade.

## What we could NOT learn
The leaders' source is withheld: their public status view lists no
repository, so no README, STRATEGY.md or method could be read. Nothing
about their implementation is claimed here — no winner's method is
invented or copied. The study rests on titles + live scores only, plus
the kit's own ladder (competition.yaml), which is public and specific:
4-strong "Panel Press" (four-panel grid, hero-and-three + full-bleed
layouts, gradient-map grades, Anton lettering); 5-pro "Sunset Sleeve"
(six layouts, five grades, sunset-gradient lettering + neon script
subtitle, grain + vignette); 6-elite "Palm Poster Lab" (nine-panel grid +
title block, heat-meter stars + badge ribbon, every size at once);
7-ace "Neon Coast Cover Studio" (inked/banded panels, halftone title
block, tilted snapshot layout, story size, undo/redo).

## What we followed
The entry aims at the 5-pro/6-elite feature set and matches 7-ace's:
five layouts (grid4, hero+three, full-bleed, nine-panel, tilted
snapshots), five gradient-map grades, Anton caption with a sunset
gradient fill + Pacifico neon script subtitle, title block with
heat-meter stars + badge ribbon, grain + vignette, undo/redo, all three
post sizes, per-panel crop/position and per-panel photo assignment.
Our own title ("Palm Heat Cover Studio") is invented and is not any
leader's exact title.

## Build log
- Fonts downloaded this session from google/fonts: Anton-Regular.ttf and
  Pacifico-Regular.ttf with their OFL.txt licence files, into app/fonts/.
- App rewritten wholesale in this session (index.html, style.css,
  src/cover.js, src/grades.js, src/layouts.js, src/main.js, src/shots.js).
- Screenshots taken by the builder with Playwright against `node serve.ts`
  on localhost:8080; the app made zero network requests in the browser.
- main.ts: starter plumbing kept, with the builder's own header and a
  validation/log step added (at least one authored line, as required).
