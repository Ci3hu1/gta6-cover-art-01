[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Ci3hu1/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Ci3hu1/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Palm Heat Cover Studio

An offline web app that turns any photo and a caption into GTA 6-style cover art: a multi-panel comic-ink poster with bold Anton lettering, a neon Pacifico subtitle, five colour grades and PNG export in the three common post sizes (1080 x 1080, 1080 x 1350, 1920 x 1080). Everything runs in the browser from local files — the photos never leave the machine, and the app makes zero network requests.

The cover engine is a real comic-ink pipeline in canvas pixel code: Sobel edge detection draws thick black ink outlines, the image is posterized to five tones, halftone dots screen the shadows and paper grain finishes the print. The grade is applied after the ink, so panels read as hand-drawn poster art rather than a photo filter. Five grades (Vice Sunset, Neon Night, Golden Coast, Noir Ink, Teal Pink), four layouts plus a tilted-snapshot variant, a hero-led grid with the hero panel top-left, per-panel photo assignment and crop, undo/redo, and a WANTED badge with a five-star heat meter.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Pick a layout and grade, type a caption, assign a photo to each panel, and export a PNG.

## Tests

```sh
node --test tests/run.mjs
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
