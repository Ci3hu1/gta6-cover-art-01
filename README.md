# Palm Heat Cover Studio

Turn any photo into GTA 6-style cover art — a multi-panel comic-ink poster with bold Anton lettering, a neon-script subtitle, a 5-star heat meter and a WANTED badge — exported as a PNG. Fully offline: every font, photo and script is a file under `app/`, nothing loads over the network.

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Ci3hu1/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Ci3hu1/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — pick a caption, a grade and a layout, change any panel's photo, focus or zoom, and hit **Export PNG** (1080×1080, 1080×1350 or 1920×1080). Undo/redo included; your own photo can be added from your machine and never leaves it.

## Tests

```sh
node tests/run.mjs
```

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
