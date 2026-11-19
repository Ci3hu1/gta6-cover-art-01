# Strategy — Palm Heat Cover Studio v2.1

## The bet

The judge compares screenshots two at a time and picks the better cover
art app. The live top 10 are all multi-panel cover makers with several
grades and layouts — so the entry must match that feature list AND win on
the one thing a title cannot show: the art itself must look inked, not
filtered.

## How it wins

1. **The ink pipeline is the edge.** Every panel goes through real pixel
   code — Sobel edges dilated into thick black outlines, 5-tone
   posterize, Bayer halftone in the shadows, paper grain — before the
   grade palette is applied. At contact-sheet size the posters read as
   hand-inked comic art, which is exactly the GTA look (Stephen Bliss:
   thick black ink, halftone shadows, limited bold palette) and exactly
   what a flat duotone filter cannot fake.
2. **Hero-led hierarchy.** The hero panel is 2×, top-left, with the face
   fully in frame; supporting panels vary in size; the eye travels
   diagonally. Five layouts keep one design system (same frames, same
   title block, same badge) so every export looks like the same studio.
3. **Five grades that re-ink, not tint.** Each grade is its own 5-step
   palette + ink colour + halftone density, so Neon Night and Noir Ink
   are genuinely different posters from the same photos.
4. **Story details sell the fiction.** "OCEAN DR", the "LEONIDA" plate,
   the WANTED badge and the 5-star heat meter are the hidden-signature
   details Bliss puts in panels — small, but they make the poster tell a
   story instead of decorating a photo.
5. **Fast and easy is a scored criterion.** Six bundled photos, one-click
   presets (Palm Heat / Neon Drive / Night Shift), per-panel focal
   sliders, undo/redo, one-click PNG export in all three post sizes —
   photo to shareable PNG in under a minute, offline.

## Tried and dropped

- Flat duotone grade (v1): looked like a filter; the user said
  "kurang bagus". Replaced by the ink pipeline.
- Repeating the same 2 photos across panels (v1): reads as a template.
  Six photos, one per panel.
- Title over the bottom row at 0.135×H: clipped the star row and buried
  the bottom panels. Shrunk to 0.115×H, stars clear the frame.

## Expected outcomes

- Gate: app/ within caps, 4 screenshots ≤ 256 KiB, dossier ≤ 1.5 MiB —
  verified locally (dossier 1,057,451 bytes).
- Judge: wins on art (inked panels + strong outlined title), any photo
  (6 samples + upload, per-panel crop), fast/easy (presets, 3 export
  sizes), polish (offline, undo/redo, grain + vignette).
- Risk: the picsum photos are random Unsplash images, not Vice City
  scenes — the ink + grade system is what makes them read as one poster.
  The skyline photo is the weakest (pale sky); its zoomed horizon crop
  is the mitigation.
