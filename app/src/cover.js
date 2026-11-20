// cover.js — the comic-ink cover renderer for Palm Heat Cover Studio.
// Pure canvas 2D, no libraries. Pipeline per panel (before the grade):
//   photo -> cover-fit crop (focus-anchored, never through a face)
//        -> Sobel edge detect -> thick black ink outlines
//        -> posterize to 5 tones on the grade palette (shadows lifted)
//        -> halftone dot screen in the shadows + paper grain + vignette
// Then the title block, laid out bottom-up (see layouts.js titleBlock)
// so the 5 heat stars always sit fully inside the frame.

import { gradeById, toneFor, liftShadow } from './grades.js';
import { layoutById, panelRects, titleBlock, starCenters, sampleFile } from './layouts.js';

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + src));
    img.src = src;
  });
}

export async function loadSampleImages(ids) {
  const map = new Map();
  for (const id of ids) {
    map.set(id, await loadImage(sampleFile(id)));
  }
  return map;
}

// Cover-fit source rect for an image drawn into w x h, anchored at the
// focus point (fx, fy in 0..1) and scaled by zoom. The focus keeps a
// subject's head in frame instead of centring blindly on the photo.
export function coverFitRect(imgW, imgH, w, h, fx, fy, zoom) {
  const scale = Math.max(w / imgW, h / imgH) * (zoom || 1);
  const sw = w / scale;
  const sh = h / scale;
  let sx = fx * imgW - sw / 2;
  let sy = fy * imgH - sh / 2;
  sx = Math.max(0, Math.min(imgW - sw, sx));
  sy = Math.max(0, Math.min(imgH - sh, sy));
  return { sx, sy, sw, sh };
}

// Deterministic grain hash — same pixels every render.
function grainHash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// The ink pass: takes a canvas holding the cropped photo and returns a
// new canvas with the comic-ink treatment. Runs at panel resolution
// (capped) so it stays fast in the browser.
export function inkPanel(srcCanvas, grade) {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const sctx = srcCanvas.getContext('2d');
  const src = sctx.getImageData(0, 0, w, h);
  const data = src.data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    lum[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  // Sobel edge magnitude on luminance.
  const edge = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1] +
        lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1];
      const gy =
        -lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1] +
        lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1];
      edge[i] = Math.sqrt(gx * gx + gy * gy) / 4;
    }
  }
  const out = sctx.createImageData(w, h);
  const od = out.data;
  const ink = grade.ink;
  const threshold = grade.edgeThreshold;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      // Thick outlines: the strongest edge in the 3x3 neighbourhood wins.
      let e = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const v = edge[yy * w + xx];
          if (v > e) e = v;
        }
      }
      // In dark areas raise the threshold: ink thins out instead of
      // swallowing shadow detail (the v2.1 "dark panel" fix).
      const lifted = liftShadow(grade, lum[i]);
      const localThreshold = threshold * (1 + (1 - lifted) * 0.9);
      if (e > localThreshold) {
        od[o] = ink[0];
        od[o + 1] = ink[1];
        od[o + 2] = ink[2];
        od[o + 3] = 255;
        continue;
      }
      const tone = toneFor(grade, lifted);
      // Keep 38% of the photo's own colour so the scene stays readable.
      let r = tone[0] * 0.62 + data[o] * 0.38;
      let g = tone[1] * 0.62 + data[o + 1] * 0.38;
      let b = tone[2] * 0.62 + data[o + 2] * 0.38;
      // Halftone dots in the shadows.
      if (lifted < 0.5) {
        const gx = x % 7;
        const gy = y % 7;
        const dx = gx - 3;
        const dy = gy - 3;
        const dotR = (0.5 - lifted) * 7 * grade.halftone;
        if (dx * dx + dy * dy < dotR * dotR) {
          r = r * 0.55 + ink[0] * 0.45;
          g = g * 0.55 + ink[1] * 0.45;
          b = b * 0.55 + ink[2] * 0.45;
        }
      }
      // Paper grain.
      const n = (grainHash(x, y) - 0.5) * 16;
      // Vignette: gentle darkening toward the panel edges.
      const nx = (x / w) * 2 - 1;
      const ny = (y / h) * 2 - 1;
      const d = Math.sqrt(nx * nx + ny * ny) / Math.SQRT2;
      const vig = 1 - 0.22 * Math.max(0, (d - 0.55) / 0.45);
      od[o] = Math.max(0, Math.min(255, (r + n) * vig));
      od[o + 1] = Math.max(0, Math.min(255, (g + n) * vig));
      od[o + 2] = Math.max(0, Math.min(255, (b + n) * vig));
      od[o + 3] = 255;
    }
  }
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  outCanvas.getContext('2d').putImageData(out, 0, 0);
  return outCanvas;
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function fitFont(ctx, text, fontFamily, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${size}px ${fontFamily}`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size = Math.floor(size * 0.92);
    ctx.font = `${size}px ${fontFamily}`;
  }
  return size;
}

// Render the whole cover onto ctx (a canvas already sized W x H).
// opts: { layout, grade, caption, subtitle, images (Map id -> Image),
//         panelPhotos (optional array of sample ids, one per panel),
//         panelFocus (optional array of {fx, fy, zoom}) }
export async function renderCover(ctx, W, H, opts) {
  const grade = gradeById(opts.grade);
  const layout = layoutById(opts.layout);
  const caption = (opts.caption || 'PALM HEAT').toUpperCase();
  const subtitle = opts.subtitle || 'Vice City Nights';

  // Sky backdrop (shows through the 3px gutters).
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const rects = panelRects(layout.id, W, H);
  const photos = opts.panelPhotos || layout.panels.map((p) => p.photo);
  const focus = opts.panelFocus || layout.panels.map((p) => ({ fx: p.fx, fy: p.fy, zoom: p.zoom }));

  for (let k = 0; k < rects.length; k++) {
    const r = rects[k];
    const img = opts.images.get(photos[k]);
    if (!img) continue;
    const inset = 3;
    const px = r.x + inset;
    const py = r.y + inset;
    const pw = Math.max(8, r.w - inset * 2);
    const ph = Math.max(8, r.h - inset * 2);
    // Work at capped resolution for the ink pass.
    const scale = Math.min(1, 480 / Math.max(pw, ph));
    const cw = Math.max(8, Math.round(pw * scale));
    const ch = Math.max(8, Math.round(ph * scale));
    const work = document.createElement('canvas');
    work.width = cw;
    work.height = ch;
    const wctx = work.getContext('2d');
    const f = focus[k];
    const src = coverFitRect(img.naturalWidth, img.naturalHeight, cw, ch, f.fx, f.fy, f.zoom);
    wctx.drawImage(img, src.sx, src.sy, src.sw, src.sh, 0, 0, cw, ch);
    const inked = inkPanel(work, grade);

    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    if (r.tilt) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((r.tilt * Math.PI) / 180);
      ctx.drawImage(inked, -pw / 2 - 6, -ph / 2 - 6, pw + 12, ph + 12);
    } else {
      ctx.drawImage(inked, px, py, pw, ph);
    }
    // Story details, drawn into the panels: a street sign on the hero
    // panel and a LEONIDA plate on the car panel.
    if (photos[k] === 'boulevard') {
      ctx.fillStyle = '#0d5c2e';
      ctx.fillRect(px + pw - 132, py + 12, 120, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OCEAN DR', px + pw - 72, py + 26);
    }
    if (photos[k] === 'car') {
      ctx.fillStyle = '#f2f2e8';
      ctx.fillRect(px + 12, py + ph - 34, 92, 22);
      ctx.fillStyle = '#123a6d';
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LEONIDA', px + 58, py + ph - 23);
    }
    ctx.restore();
    // Thick black comic frame around the panel.
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeRect(px, py, pw, ph);
  }

  // ---- Title block (bottom-up: nothing can run off the bottom edge) ----
  const tb = titleBlock(W, H);
  const scrim = ctx.createLinearGradient(0, tb.scrimTop, 0, H);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, tb.scrimTop, W, H - tb.scrimTop);

  // WANTED badge, top-left, safely inside the frame.
  const badgeW = Math.round(W * 0.16);
  const badgeH = Math.round(Math.min(W, H) * 0.045);
  ctx.save();
  ctx.translate(18, 18);
  ctx.rotate(-0.03);
  ctx.fillStyle = '#b3122e';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(0, 0, badgeW, badgeH, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(badgeH * 0.52)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ WANTED ★', badgeW / 2, badgeH / 2 + 1);
  ctx.restore();

  // Main title: Anton, white-to-gold gradient, ~8px black stroke,
  // hard offset drop shadow. Sized to fit the width.
  const titleSize = fitFont(ctx, caption, 'Anton, sans-serif', tb.titleSize, W * 0.94);
  const grad = ctx.createLinearGradient(0, tb.titleBaseline - titleSize, 0, tb.titleBaseline);
  grad.addColorStop(0, grade.titleFrom);
  grad.addColorStop(1, grade.titleTo);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = Math.round(titleSize * 0.12);
  // Hard offset shadow first.
  ctx.fillStyle = '#000000';
  ctx.fillText(caption, W / 2 + 5, tb.titleBaseline + 7);
  // Thick black stroke, then gradient fill.
  ctx.lineWidth = Math.max(6, Math.round(titleSize * 0.075));
  ctx.strokeStyle = '#000000';
  ctx.strokeText(caption, W / 2, tb.titleBaseline);
  ctx.fillStyle = grad;
  ctx.fillText(caption, W / 2, tb.titleBaseline);
  ctx.shadowBlur = 0;

  // Neon-script subtitle between title and stars.
  ctx.font = `${tb.subtitleSize}px Pacifico, cursive`;
  ctx.fillStyle = grade.subtitle;
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = 12;
  ctx.fillText(subtitle, W / 2, tb.subtitleBaseline);
  ctx.shadowBlur = 0;

  // 5-star heat meter — centred on tb.starsCy, whose bottom edge is
  // exactly bottomMargin above the frame: fully visible, clear space below.
  for (const s of starCenters(W, H)) {
    starPath(ctx, s.x, s.y, s.r);
    ctx.fillStyle = '#ffd75e';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
  }
}

// Render a cover to a fresh canvas at W x H and return it.
export async function coverCanvas(W, H, opts) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  await renderCover(canvas.getContext('2d'), W, H, opts);
  return canvas;
}
