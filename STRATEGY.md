# STRATEGY — Palm Heat Cover Studio v2.1

## The edge
The judge compares screenshots pairwise, and the cover screenshot goes on
top of the contact sheet at the largest size. So the whole entry is built
backwards from that one image: it must read as GTA cover art at a glance.
Three things do that, in order:

1. **Real ink, not a filter.** The pipeline detects edges from the photo
   itself and redraws them as thick black outlines, flattens the photo to
   five tones, and screens halftone dots into the shadows. That is the
   Stephen Bliss look — pulp + comic + high fashion — and it is what
   separates this entry from every flat duotone filter in the field. The
   five grades restyle the same ink, so one photo gives five different
   posters.
2. **A face that survives the crop.** The hero panel is tall, the crop is
   anchored on a measured focus point, and a safe box (head + shoulders)
   is guaranteed visible — letterboxed before it is ever cut. A cover
   whose lead has no face loses to one whose lead does, whatever the
   filter.
3. **A story in the details.** "OCEAN DR" and "LEONIDA" hidden in the
   panels, a WANTED badge, a five-star heat meter, a neon-script subtitle
   under a hard-outlined title. The poster tells you where you are and
   what happened there.

## What was tried and dropped
- **Flat duotone grade (v1).** A single orange overlay over the photo.
  Looked like a filter, not art. Dropped for the ink pipeline.
- **Repeated photos across panels (v1).** Two photos reused in four
  panels. Looked cheap at a glance. Now six distinct samples, five
  different ones in every default cover.
- **Wide short hero panel (v2).** Cropped the lead's face. Dropped: the
  hero is tall in every layout, and the safe-box rule is enforced in code
  and tests.
- **Empty-sky panel as a full panel (v2).** The foggy sunset read as
  blank gradient. Now its cloud band is the focus, and wide empty photos
  go in the Sunset Strip layout where emptiness is the point.

## Expected outcome
The entry contends beside the 7-ace rung (inked/banded panels, halftone
title block, tilted snapshots, story size, undo/redo) with a cover whose
lead face is always visible. Live score is the judge — the local tests
only prove the framing rules hold; the resubmission loop (up to 5 per
competition, ~20 minutes apart, only on a real improvement) decides the
next version.
