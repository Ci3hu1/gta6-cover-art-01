// cover.js — the comic-ink render pipeline for Palm Heat Cover Studio.
//
// Pipeline (per panel, in canvas pixel code, no libraries):
//   Sobel edge detect -> thick black ink outlines -> posterize to 5 tones
//   -> halftone dot screen in shadows -> paper grain -> grade gradient map.
// The ink pass runs BEFORE the colour grade, so the result reads as
// hand-inked poster art, not a photo filter.
//
// v2.1 framing fixes live here too:
//   1. coverCropRect() anchors every crop on a focal point and, for hero
//      panels, biases the window up so a face near the top of the photo
//      (eyes, nose, mouth) stays fully in frame — never crop through a face.
//   2. Dark photos get a lifted shadow floor (see grades.shadowFloorFor)
//      so the camera panel reads clearly instead of going nearly black.
//   3. The skyline photo's focal point sits on its busy lower band
//      (water + horizon), never on the empty sky.
//
// Pure pixel functions take plain {width, height, data} images so the
// Node tests can exercise them without a browser.

import { gradeById, gradeColor, hexRgb, meanLuminance, shadowFloorFor } from './grades.js';
import { layoutPanels } from './layouts.js';

// ---------------------------------------------------------------------------
// Sample photos and their focal points (fractions of the photo).
// Focal points were set by looking at each downloaded photo: the point the
// crop must keep in frame. Boulevard/pier are the kit's house photos:
// boulevard = woman with sunglasses leaning on a red convertible (face in
// the upper third); pier = older man with a bucket hat on a pier (face up
// top). Car = person holding a vintage camera (camera + hands centre;
// the source photo itself cuts the face at the top edge). Skyline = foggy
// sunset over water, busy only in its lower band. Crowd = sunlit park,
// bright middle band. Neon = mountain ridge with hikers lower right.
// ---------------------------------------------------------------------------
export const SAMPLE_PHOTOS = [
  { id: 'boulevard', src: 'samples/boulevard.jpg', label: 'Boulevard', fx: 0.5, fy: 0.3 },
  { id: 'pier', src: 'samples/pier.jpg', label: 'Pier', fx: 0.5, fy: 0.32 },
  { id: 'car', src: 'samples/car.jpg', label: 'Camera', fx: 0.5, fy: 0.45 },
  { id: 'skyline', src: 'samples/skyline.jpg', label: 'Skyline', fx: 0.5, fy: 0.72 },
  { id: 'crowd', src: 'samples/crowd.jpg', label: 'Park', fx: 0.5, fy: 0.62 },
  { id: 'neon', src: 'samples/neon.jpg', label: 'Ridge', fx: 0.55, fy: 0.55 },
];

export function photoById(id) {
  return SAMPLE_PHOTOS.find((p) => p.id === id) || SAMPLE_PHOTOS[0];
}

// Default cover preset: hero-led layout, five DIFFERENT photos, one panel
// each — never repeated in one poster.
export const DEFAULT_COVER = {
  layout: 'hero',
  grade: 'vice',
  caption: 'PALM HEAT',
  subtitle: 'Vice City nights',
  photos: ['boulevard', 'neon', 'car', 'crowd', 'pier'],
};

// ---------------------------------------------------------------------------
// Crop math (pure)
// ---------------------------------------------------------------------------
/**
 * Cover-fit source rectangle for a photo of photoW x photoH drawn into a
 * panel of panelW x panelH, anchored on focal point (fx, fy) in 0..1.
 * With headroom=true (hero panels) the window is shifted up so the focal
 * point sits 38% down from the window top — head + shoulders stay in
 * frame even when the face sits near the photo's top edge.
 * Returns {sx, sy, sw, sh} in source pixels.
 */
export function coverCropRect(photoW, photoH, panelW, panelH, fx, fy, headroom = false) {
  const scale = Math.max(panelW / photoW, panelH / photoH);
  const sw = panelW / scale;
  const sh = panelH / scale;
  const cx = fx * photoW;
  const cy = fy * photoH;
  let sx = cx - sw / 2;
  let sy = headroom ? cy - sh * 0.38 : cy - sh / 2;
  sx = Math.max(0, Math.min(photoW - sw, sx));
  sy = Math.max(0, Math.min(photoH - sh, sy));
  return { sx, sy, sw, sh };
}

// ---------------------------------------------------------------------------
// Ink pipeline (pure pixel code)
// ---------------------------------------------------------------------------
/** Luminance of one RGB pixel. */
export function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Posterize a 0..1 luminance to one of 5 tone steps. */
export function posterizeTone(lum, tones = 5) {
  return Math.max(0, Math.min(tones - 1, Math.floor(lum * tones)));
}

/**
 * Sobel edge magnitude (0..255) for every pixel of a grayscale image.
 * gray is a Float32Array of width*height luminances (0..255).
 */
export function sobelEdges(gray, width, height) {
  const mag = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] - 2 * gray[i - 1] - gray[i + width - 1] +
        gray[i - width + 1] + 2 * gray[i + 1] + gray[i + width + 1];
      const gy =
        -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
        gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
      mag[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return mag;
}

/** Dilate a 0/1 mask by radius r (two separable box passes). */
export function dilateMask(mask, width, height, r) {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(width * height);
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let dx = -r; dx <= r && !v; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < width && mask[y * width + xx]) v = 1;
      }
      tmp[y * width + x] = v;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let dy = -r; dy <= r && !v; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < height && tmp[yy * width + x]) v = 1;
      }
      out[y * width + x] = v;
    }
  }
  return out;
}

/** Deterministic hash noise in [-1, 1] for paper grain. */
export function grainNoise(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/**
 * Apply the comic-ink pipeline to an {width, height, data} RGBA image
 * (ImageData in the browser, a plain object in tests). Mutates and returns
 * the image. Options:
 *   grade      — grade object (see grades.js)
 *   inkWidth   — outline thickness in px (1..3)
 *   grain      — paper grain strength 0..14
 *   edgeThreshold — Sobel magnitude that counts as an edge (default 90)
 *   gradeMix   — 0..1, how much of the grade palette vs the photo's own
 *                colour (default 0.7: graded, but still photographic)
 */
export function applyInk(img, opts = {}) {
  const { width: W, height: H, data: d } = img;
  const grade = opts.grade || gradeById('vice');
  const inkWidth = opts.inkWidth ?? 2;
  const grain = opts.grain ?? 8;
  const edgeThreshold = opts.edgeThreshold ?? 90;
  const gradeMix = opts.gradeMix ?? 0.7;
  const ink = hexRgb(grade.ink);

  const n = W * H;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    gray[i] = luminance(d[o], d[o + 1], d[o + 2]);
  }
  const meanLum = gray.reduce((a, b) => a + b, 0) / n / 255;
  const floor = shadowFloorFor(grade, meanLum);

  const mag = sobelEdges(gray, W, H);
  const edge = new Uint8Array(n);
  for (let i = 0; i < n; i++) edge[i] = mag[i] > edgeThreshold ? 1 : 0;
  const inkMask = dilateMask(edge, W, H, inkWidth - 1);

  // Halftone dot spacing scales with the image so dots read the same at
  // any export size.
  const spacing = Math.max(3, Math.round(grade.halftone * (W / 800)));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = i * 4;
      // Lift the shadows before posterizing: dark photos keep detail.
      let lum = gray[i] / 255;
      lum = floor + lum * (1 - floor);
      const tone = posterizeTone(lum, 5);
      const [gr, gg, gb] = gradeColor(grade, lum);
      let r = gr * gradeMix + d[o] * (1 - gradeMix);
      let g = gg * gradeMix + d[o + 1] * (1 - gradeMix);
      let b = gb * gradeMix + d[o + 2] * (1 - gradeMix);

      // Halftone dots in the two darkest tones.
      if (tone <= 1 && spacing > 0) {
        const row = Math.floor(y / spacing);
        const col = Math.floor(x / spacing);
        const cx = col * spacing + (row % 2 ? spacing / 2 : 0) + spacing / 2;
        const cy = row * spacing + spacing / 2;
        const dx = x - cx;
        const dy = y - cy;
        const radius = spacing * (tone === 0 ? 0.42 : 0.3);
        if (dx * dx + dy * dy < radius * radius) {
          r = ink[0];
          g = ink[1];
          b = ink[2];
        }
      }

      // Thick ink outlines win over everything.
      if (inkMask[i]) {
        r = ink[0];
        g = ink[1];
        b = ink[2];
      }

      // Paper grain.
      if (grain > 0) {
        const nz = grainNoise(x, y) * grain;
        r += nz;
        g += nz;
        b += nz;
      }

      d[o] = Math.max(0, Math.min(255, Math.round(r)));
      d[o + 1] = Math.max(0, Math.min(255, Math.round(g)));
      d[o + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }
  return img;
}

// ---------------------------------------------------------------------------
// Cover rendering (browser canvas)
// ---------------------------------------------------------------------------
/** Draw one inked panel image into ctx at panel rect (supports tilt). */
export function drawInkedPanel(ctx, photoImg, panel, photo, grade, opts) {
  const scale = Math.max(1, Math.min(2, panel.w / 640));
  const pw = Math.max(2, Math.round(panel.w / scale));
  const ph = Math.max(2, Math.round(panel.h / scale));
  const off = document.createElement('canvas');
  off.width = pw;
  off.height = ph;
  const octx = off.getContext('2d');
  const crop = coverCropRect(
    photoImg.naturalWidth,
    photoImg.naturalHeight,
    pw,
    ph,
    photo.fx,
    photo.fy,
    panel.role === 'hero',
  );
  octx.drawImage(photoImg, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, pw, ph);
  const imgData = octx.getImageData(0, 0, pw, ph);
  applyInk(imgData, {
    grade,
    inkWidth: opts.inkWidth ?? 2,
    grain: opts.grain ?? 8,
    gradeMix: 0.7,
  });
  octx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
  if (panel.tilt) ctx.rotate((panel.tilt * Math.PI) / 180);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-panel.w / 2 - 4, -panel.h / 2 - 4, panel.w + 8, panel.h + 8);
  ctx.drawImage(off, -panel.w / 2, -panel.h / 2, panel.w, panel.h);
  ctx.strokeStyle = grade.ink;
  ctx.lineWidth = Math.max(2, panel.w * 0.006);
  ctx.strokeRect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
  ctx.restore();
}

/** Small-print story details drawn into the panels. */
export function drawStoryDetails(ctx, panels, W, H) {
  // Street sign "OCEAN DR" on the hero panel's top-right corner.
  const hero = panels.find((p) => p.role === 'hero');
  if (hero) {
    const fs = Math.max(11, Math.round(H * 0.016));
    ctx.save();
    ctx.font = `700 ${fs}px Anton, sans-serif`;
    const label = 'OCEAN DR';
    const tw = ctx.measureText(label).width;
    const x = hero.x + hero.w - tw - 22;
    const y = hero.y + 14;
    ctx.fillStyle = '#0d5c34';
    ctx.fillRect(x - 8, y, tw + 16, fs + 10);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 8, y, tw + 16, fs + 10);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x, y + fs + 2);
    ctx.restore();
  }
  // License plate "LEONIDA" at the TOP-LEFT of the bottom-right panel —
  // the title block owns the bottom of the cover and the WANTED badge
  // owns the bottom-right corner, so the plate lives up top instead.
  const br = panels[panels.length - 1];
  if (br) {
    const fs = Math.max(10, Math.round(H * 0.014));
    ctx.save();
    ctx.font = `700 ${fs}px Anton, sans-serif`;
    const label = 'LEONIDA';
    const tw = ctx.measureText(label).width;
    const x = br.x + 20;
    const y = br.y + 14;
    ctx.fillStyle = '#f5f0dc';
    ctx.fillRect(x - 7, y, tw + 14, fs + 8);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 7, y, tw + 14, fs + 8);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText(label, x, y + fs + 1);
    ctx.restore();
  }
}

/** Five-star heat meter. Filled stars = heat (default 5). */
export function drawHeatMeter(ctx, cx, y, size, heat = 5) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const gap = size * 1.35;
  const x0 = cx - ((5 - 1) * gap) / 2;
  for (let i = 0; i < 5; i++) {
    const x = x0 + i * gap;
    drawStar(ctx, x, y, size, i < heat);
  }
  ctx.restore();
}

function drawStar(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(ang) * rr;
    const py = y + Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd166' : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.stroke();
}

/** "WANTED" badge, tilted, bottom-right of the cover. */
export function drawWantedBadge(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((-7 * Math.PI) / 180);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = Math.max(2, h * 0.08);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#160a24';
  ctx.font = `400 ${Math.round(h * 0.52)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WANTED', 0, 1);
  ctx.restore();
}

/**
 * Render a full cover onto a canvas. photos is a Map of id -> HTMLImageElement.
 * state: {layout, grade, caption, subtitle, photos: [ids], inkWidth, grain}
 * The canvas is sized to size {w, h} first by the caller.
 */
export function renderCover(canvas, photos, state, size) {
  const ctx = canvas.getContext('2d');
  const W = size.w;
  const H = size.h;
  const grade = gradeById(state.grade);
  const panels = layoutPanels(state.layout, W, H);

  // Paper background.
  ctx.fillStyle = '#f5efe2';
  ctx.fillRect(0, 0, W, H);

  // Panels, one photo each.
  panels.forEach((panel, i) => {
    const photoId = state.photos[i % state.photos.length];
    const photo = photoById(photoId);
    const img = photos.get(photoId);
    if (!img) return;
    drawInkedPanel(ctx, img, panel, photo, grade, state);
  });

  drawStoryDetails(ctx, panels, W, H);

  // Title block: scrim, subtitle, big outlined title, heat meter, badge.
  const scrim = ctx.createLinearGradient(0, H * 0.62, 0, H);
  scrim.addColorStop(0, 'rgba(12,4,24,0)');
  scrim.addColorStop(1, 'rgba(12,4,24,0.62)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);

  const titleSize = Math.round(H * 0.115);
  const subSize = Math.round(H * 0.038);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Neon-script subtitle above the title.
  ctx.save();
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.fillStyle = grade.glow;
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = Math.round(H * 0.02);
  ctx.fillText(state.subtitle || '', W / 2, H - titleSize * 1.55);
  ctx.restore();

  // Main title: Anton, white-to-gold gradient, ~8px black stroke
  // (scaled with the cover), hard offset drop shadow.
  const title = (state.caption || 'PALM HEAT').toUpperCase();
  ctx.save();
  ctx.font = `${titleSize}px Anton, sans-serif`;
  const grad = ctx.createLinearGradient(0, H - titleSize * 1.5, 0, H - titleSize * 0.2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#ffd166');
  const strokeW = Math.max(4, Math.round((H / 1080) * 8));
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  // Hard offset shadow.
  ctx.fillStyle = 'rgba(10,4,20,0.9)';
  ctx.fillText(title, W / 2 + strokeW, H - titleSize * 0.28 + strokeW);
  // Stroke under fill (paint-order: stroke).
  ctx.lineWidth = strokeW;
  ctx.strokeStyle = grade.ink;
  ctx.strokeText(title, W / 2, H - titleSize * 0.28);
  ctx.fillStyle = grad;
  ctx.fillText(title, W / 2, H - titleSize * 0.28);
  ctx.restore();

  // Heat meter + WANTED badge.
  drawHeatMeter(ctx, W / 2, H - titleSize * 0.02 - Math.round(H * 0.012), Math.round(H * 0.016), 5);
  const bw = Math.round(W * 0.13);
  const bh = Math.round(H * 0.045);
  drawWantedBadge(ctx, W - bw - Math.round(W * 0.02), H - bh - Math.round(H * 0.03), bw, bh);
}
