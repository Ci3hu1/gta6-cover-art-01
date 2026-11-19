# Strategy — Palm Heat Cover Studio v2

## How it wins

The judge's first criterion is the art, and the art is decided by the
screenshots. v1 lost there: a flat orange filter over two repeated photos
reads as a photo filter, and the judge (and the user) can tell. v2's edge
is a real comic-ink pipeline — Sobel edges, thick dilated ink outlines,
5-tone posterize, halftone dots in the shadows, paper grain — so the
panels look inked and hand-drawn the way Stephen Bliss draws GTA covers,
not filtered.

## The three bets

1. **Ink over filter.** The pipeline runs per photo before the grade, so
   every grade keeps the same hand-drawn structure. Outlines and halftone
   are the most visible difference in a side-by-side judge pairing.
2. **Hero-led hierarchy.** One big hero panel top-left (Bliss's rule),
   four supporting panels of varied sizes, five different photos in the
   default preset — a poster that tells a story (boulevard, pier, car,
   skyline, crowd) instead of one photo repeated.
3. **Title as logo.** Anton with a white-to-gold gradient, an ~8px black
   stroke and a hard offset shadow, a Pacifico neon subtitle, a WANTED
   badge and a 5-star heat meter. The title block is the second thing the
   judge reads after the panels.

## Measured checks

- Node tests cover the pipeline math (Sobel on a step edge, posterize
  bands, dilation radius, halftone determinism, palette-only output),
  the five grades (pairwise distinct palettes) and the five layouts
  (5 panels, no overlap, hero ≥1.8× median panel area, tilted rotates).
- `main.ts` is verified to copy app/ + screenshots/ and write a valid
  dossier.json within the gate caps (screenshots ≤256 KiB, dossier ≤1.5 MiB).
- Screenshots are the app itself running on localhost:8080 — the cover,
  the editor with a photo loaded, the portrait cover, and the four-layout
  overview.

## Tried and dropped

- A single duotone grade over the whole poster (v1): flat, no depth.
- Reusing 2 sample photos across 5 panels: reads as a template, not a
  poster. v2 ships 6 distinct samples and never repeats one in a cover.
- Title without a black stroke: the lettering disappears against bright
  photos. The ~8px stroke + offset shadow fixes it at every size.
