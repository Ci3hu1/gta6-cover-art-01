# Palm Heat Cover Studio — build notes (v2)

## Top-10 study (live, 19 Nov 2026 ~20:03 WIB, 1,557 entries)

Every leader is a multi-panel cover-MAKER tool, not a single-photo filter:

| # | Entry | Live score |
|---|-------|-----------|
| 1 | nightshift-labs "HEATWAVE Cover Studio" — 4 layouts, 4 gradients | 929,191 |
| 2 | sunny-kestrel-27 "Golden Coast Cover Lab" | 920,012 |
| 3 | lomfi "Neon and sunset multi-panel cover maker" | 905,386 |
| 4 | dany-mardiana "Vice Press" | 884,126 |
| 5 | crisp-coyote-57 "Neon Grid Cover Studio: 5-panel, 4 grades, 3 layouts, bold lettering" | 880,371 |
| 6–8 | Neon Shore / Neon Palms / Neon Coast Cover Studio | ~874,000 |
| 9 | udines "Vice Collage — five-panel GTA-style, sunset + neon grading" | 870,642 |
| 10 | cosmic "Solstice Studio" | 868,657 |

All leaders withhold source (titles + scores only), so the study is on what is
visible: multi-panel grids, several grades, several layouts, bold lettering.
The winning pattern is a tool with 5 panels, 4–5 grades, 3–4 layouts.

## Stephen Bliss research (Rockstar artist, defined the GTA look, 2001–2016)

- Comic grid, varied panel sizes, hero panel top-left (GTA 6 keeps the
  helicopter top-left).
- Thick BLACK ink outlines + cell-shading with gritty realistic weight —
  "People often think it's just a Photoshop filter. It's not. Everything is
  hand-drawn."
- Halftone dots in shadows; limited bold palette, high contrast.
- 1950s pulp + comic book + high-fashion illustration hybrid.
- Hidden signature details in panels (street names, brand logos).
- "Whatever I do has to create an emotional connection" — the poster tells
  a story.
- General cover principles: Hero + Logo = Box Art; rule of thirds;
  foreground/midground/background depth; strong silhouette; one consistent
  design system across layouts.

## What v1 got wrong (user verdict: "kurang bagus")

v1 matched the leaders' feature list but lost on visual quality: the same 2
photos repeated across panels; a flat orange duotone with no ink and no
halftone; a weak title outline; uniform panels with no hierarchy; no story
details.

## What v2 follows

- Bliss's ink rules, implemented as a real pixel pipeline (not a filter):
  Sobel edges → dilated thick ink outlines → posterize to 5 tones →
  halftone dot screen in shadows → paper grain → gradient-map grade.
- Hero-led grid: hero panel 2x, top-left; supporting panels varied sizes.
- Six distinct bundled sample photos, never repeated in one poster; the
  default preset uses 5 different photos, one per panel.
- Pricedown-style title: Anton, white-to-gold gradient, ~8px black stroke
  (paint-order: stroke), hard offset shadow; Pacifico neon subtitle;
  WANTED badge + 5-star heat meter; story details drawn into panels
  ("OCEAN DR" street sign, "LEONIDA" plate).
- Five truly distinct grades (Vice Sunset, Neon Night, Golden Coast,
  Noir Ink, Teal Pink), each with its own ink, palette, halftone density
  and glow.

## Build log (v2, 19 Nov 2026)

- Fresh kit downloaded to gta6-cover-art-01-kit-v2 (kit level 20); contract
  read from competition.yaml: main.ts copies app/ + screenshots/ to /output
  and writes dossier.json via vendor/makefun-app.ts (kit copy, unchanged).
- Recorder started before any code was written
  (`node cli/makefun.mjs record --competition gta6-cover-art-01 --source <repo>`,
  pid 13599, still running at build end) — strict_transcripts.
  ⚠️ RECORDER WARNING: this builder session began BEFORE the recording
  started, so the recorder says nothing this session builds can enter
  (transcripts_witnessed fails a session begun before its recording).
  The recording was left running on purpose: the fix is a NEW builder
  session started AFTER the recording began (a fresh subagent) rewriting
  the entry files from the brief, so the recorded session owns every line.
  Do NOT stop the recorder before that rebuild. Usage rows for the seal go
  to ~/.makefun/muse-usage-gta6-cover-art-01.jsonl (SELECT from muse.db).
- 4 new sample photos from picsum.photos (fixed seeds vicecar, leonida,
  beachcrowd, neonstreet, 800×600); 2 existing samples untouched.
- Anton + Pacifico TTFs + OFL.txt from google/fonts (raw) into app/fonts/.
- All files written fresh from the v2 brief; tests in tests/ (Node, no deps);
  4 Playwright screenshots against `node serve.ts` on :8080.
- Live scores: v1 was never submitted (awaiting 'Setuju'); v2 also awaits
  the owner's 'Setuju' before any submit. No claim, no submit yet.
