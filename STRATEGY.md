# Strategy — Leonida Nights Cover Studio v3

## How it wins
The judge's first criterion is the art, and the live top 10 all agree on what
that art is: a clean photographic multi-panel poster, not a filter demo.
v2.1 lost on exactly this — the comic-ink pipeline made faces look dirty.
v3 bets everything on clean photos + the three signatures the winners share:

1. **Clean photo + pop-out hero.** The hero stands proud of the grid
   (expanded ~24px, drop shadow, white keyline) with a face-aware crop that
   never cuts through a face. The eye lands on a person, not a grid.
2. **Chrome title over the art.** Striped retro-chrome 3D Anton lettering
   across the lower third, on a scrim, with a Pacifico neon subtitle, a
   WANTED badge and a 5-star heat meter that can never be cut off (bottom-up
   geometry, >= 36px clear space — the owner's reported defect, fixed by
   construction and covered by a test).
3. **A real studio, not a template.** 3-step flow, 6 layouts, 6 grades,
   per-panel crop/position/flip/swap, editable cast tags, undo/redo,
   "Surprise me", and one-click PNG export in all three post sizes. The
   second and third judge criteria (any photo, fast and easy) are answered
   by the studio itself.

## Measured edge
- 8/8 Node tests pass (layout bounds, 5 distinct photos, face-aware crop
  anchor, star clearance >= 36px at every size).
- Zero browser network requests (all assets vendored under app/).
- Screenshots are the app's own drawing at the gate's sizes.

## Tried and dropped
- Comic-ink pipeline (Sobel → posterize → halftone): rejected by the owner
  twice; dropped entirely in v3. Photos are graded, never redrawn.

## Expected outcome
A top-10-style dossier: the cover shot leads with a bright, crowded,
photographic poster; the editor shot shows the studio at work; the portrait
shot proves the 4:5 export; the layouts shot proves six layouts in one view.
