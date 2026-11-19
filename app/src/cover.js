// Comic-ink render pipeline + poster renderer for Palm Heat Cover Studio.
//
// The pipeline (per photo, before any colour grade) is what makes the art
// look inked and hand-drawn instead of a flat photo filter — Stephen Bliss:
// "People often think it's just a Photoshop filter. It's not. Everything
// is hand-drawn." So: Sobel edge detect -> thick black ink outlines
// (dilated edge mask) -> posterize to 5 tones -> halftone dot screen in
// the shadows -> paper grain -> gradient-map colour grade.
//
// Pure functions (luminance, sobelEdges, dilateMask, posterizeTone,
// halftoneAt, mulberry32, inkRender) run on plain arrays and are covered
// by Node tests. The canvas glue (processPhoto, renderCover) touches the
// DOM only inside functions, never at module load.

import { gradeColor } from './grades.js';
import { layoutRects, scaleRects } from './layouts.js';

// ---- pure pixel math ----

export function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Sobel edge magnitude, 0..1, on a Float32Array of luminance values.
export function sobelEdges(gray, w, h) {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
        gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
      const gy =
        -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
        gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
      out[i] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 1020);
    }
  }
  return out;
}

// Box-dilate a 0/1 mask by `radius` pixels (separable, two passes).
export function dilateMask(mask, w, h, radius) {
  const r = Math.max(0, Math.min(4, radius | 0));
  if (r === 0) return mask.slice();
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = -r; k <= r && !m; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < w) m = mask[y * w + xx];
      }
      tmp[y * w + x] = m;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = -r; k <= r && !m; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < h) m = tmp[yy * w + x];
      }
      out[y * w + x] = m;
    }
  }
  return out;
}

// Posterize a luminance (0..255) to one of 5 comic tones, 0 = darkest.
export function posterizeTone(lum) {
  if (lum < 42) return 0;
  if (lum < 96) return 1;
  if (lum < 150) return 2;
  if (lum < 204) return 3;
  return 4;
}

// Halftone dot test: is pixel (x,y) inside a dot? Dots live on a regular
// grid in the shadows; the darker the pixel, the bigger the dot.
export function halftoneAt(x, y, lum, spacing, density) {
  const s = Math.max(3, spacing);
  const cx = Math.floor(x / s) * s + s / 2;
  const cy = Math.floor(y / s) * s + s / 2;
  const darkness = Math.max(0, (110 - lum) / 110); // 1 at black, 0 at tone 2
  const radius = darkness * s * 0.48 * density;
  if (radius <= 0) return false;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

// Deterministic PRNG (mulberry32) so grain is stable per seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Full pipeline: RGBA bytes -> inked RGBA bytes, same size.
export function inkRender(rgba, w, h, grade, opts = {}) {
  const inkWidth = opts.inkWidth ?? 2;
  const edgeThreshold = opts.edgeThreshold ?? 0.16;
  const halftoneSpacing = opts.halftoneSpacing ?? 6;
  const grainAmount = opts.grain ?? 9;
  const seed = opts.seed ?? 7;

  const n = w * h;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    gray[i] = luminance(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
  }
  const edge = sobelEdges(gray, w, h);
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = edge[i] > edgeThreshold ? 1 : 0;
  const inked = dilateMask(mask, w, h, inkWidth);

  const out = new Uint8ClampedArray(n * 4);
  const rand = mulberry32(seed);
  const glow = grade.glow || { color: [255, 255, 255], strength: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const lum = gray[i];
      const tone = posterizeTone(lum);
      let col = gradeColor(grade, tone);
      let r = col[0];
      let g = col[1];
      let b = col[2];
      // Halftone dots in the shadows.
      if (tone <= 1 && grade.halftone > 0 && halftoneAt(x, y, lum, halftoneSpacing, grade.halftone)) {
        r = grade.ink[0]; g = grade.ink[1]; b = grade.ink[2];
      }
      // Thick ink outlines win over everything.
      if (inked[i]) {
        r = grade.ink[0]; g = grade.ink[1]; b = grade.ink[2];
      } else if (tone >= 3 && glow.strength > 0) {
        // Warm glow lifts the highlights a touch.
        const k = glow.strength * 0.18;
        r += (glow.color[0] - r) * k;
        g += (glow.color[1] - g) * k;
        b += (glow.color[2] - b) * k;
      }
      const noise = (rand() * 2 - 1) * grainAmount;
      const o = i * 4;
      out[o] = Math.max(0, Math.min(255, r + noise));
      out[o + 1] = Math.max(0, Math.min(255, g + noise));
      out[o + 2] = Math.max(0, Math.min(255, b + noise));
      out[o + 3] = rgba[o + 3];
    }
  }
  return out;
}

// ---- canvas glue ----

const MAX_WORK_SIDE = 1100;

// Run the ink pipeline over an image/canvas, return an inked canvas.
export function processPhoto(image, grade, opts = {}) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const scale = Math.min(1, MAX_WORK_SIDE / Math.max(iw, ih));
  const w = Math.max(2, Math.round(iw * scale));
  const h = Math.max(2, Math.round(ih * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const inked = inkRender(data.data, w, h, grade, opts);
  ctx.putImageData(new ImageData(inked, w, h), 0, 0);
  return canvas;
}

// Cover-fit source rect for a panel, with zoom + focal point (0..1).
export function coverFitRect(panelW, panelH, imgW, imgH, crop) {
  const zoom = Math.max(1, crop?.zoom ?? 1);
  const ox = crop?.ox ?? 0.5;
  const oy = crop?.oy ?? 0.5;
  const scale = Math.max(panelW / imgW, panelH / imgH) * zoom;
  const sw = Math.min(imgW, panelW / scale);
  const sh = Math.min(imgH, panelH / scale);
  const sx = Math.max(0, Math.min(imgW - sw, ox * imgW - sw / 2));
  const sy = Math.max(0, Math.min(imgH - sh, oy * imgH - sh / 2));
  return { sx, sy, sw, sh };
}

export function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

let noiseTile = null;
function grainTile(ctx, W, H, seed = 11) {
  if (!noiseTile) {
    noiseTile = document.createElement('canvas');
    noiseTile.width = 128;
    noiseTile.height = 128;
    const nctx = noiseTile.getContext('2d');
    const img = nctx.createImageData(128, 128);
    const rand = mulberry32(seed);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 118 + Math.floor(rand() * 20);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
  }
  const pattern = ctx.createPattern(noiseTile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Draw one story detail into a panel: a street sign or a plate.
function storyDetail(ctx, rect, kind, scale) {
  const fs = Math.max(9, Math.round(15 * scale));
  ctx.save();
  ctx.textBaseline = 'middle';
  if (kind === 'sign') {
    const w = fs * 5.4;
    const h = fs * 1.7;
    const x = rect.x + rect.w - w - 10 * scale;
    const y = rect.y + 10 * scale;
    ctx.fillStyle = '#0d5c2e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('OCEAN DR', x + w / 2, y + h / 2 + 1);
  } else if (kind === 'plate') {
    const w = fs * 5.2;
    const h = fs * 1.7;
    const x = rect.x + 10 * scale;
    const y = rect.y + rect.h - h - 10 * scale;
    ctx.fillStyle = '#f5f0dc';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 3 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111111';
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('LEONIDA', x + w / 2, y + h / 2 + 1);
  }
  ctx.restore();
}

// Render the whole poster onto ctx at W x H.
// state: { layout, grade, title, subtitle, panels: [{ inked, img, zoom, ox, oy }], grain, vignette }
export function renderCover(ctx, W, H, state) {
  const grade = state.grade;
  const scale = W / 1080;
  const titleH = Math.round(H * 0.16);
  const contentH = H - titleH;
  ctx.save();
  // Paper background.
  ctx.fillStyle = `rgb(${grade.paper[0]},${grade.paper[1]},${grade.paper[2]})`;
  ctx.fillRect(0, 0, W, H);

  const rects = scaleRects(layoutRects(state.layout, state.panels.length), W, contentH);
  rects.forEach((rect, idx) => {
    const panel = state.panels[idx];
    if (!panel) return;
    const img = panel.inked || panel.img;
    if (!img) return;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      // Polaroid white border for tilted snapshots.
      ctx.fillStyle = '#f8f4e8';
      ctx.fillRect(-7 * scale, -7 * scale, rect.w + 14 * scale, rect.h + 14 * scale);
      ctx.translate(0, 0);
      const fit = coverFitRect(rect.w, rect.h, iw, ih, panel);
      ctx.drawImage(img, fit.sx, fit.sy, fit.sw, fit.sh, 0, 0, rect.w, rect.h);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = Math.max(2, 3 * scale);
      ctx.strokeRect(0, 0, rect.w, rect.h);
      if (idx === 0) storyDetail(ctx, { x: 0, y: 0, w: rect.w, h: rect.h }, 'sign', scale);
      if (idx === 3) storyDetail(ctx, { x: 0, y: 0, w: rect.w, h: rect.h }, 'plate', scale);
    } else {
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      const fit = coverFitRect(rect.w, rect.h, iw, ih, panel);
      ctx.drawImage(img, fit.sx, fit.sy, fit.sw, fit.sh, rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
      ctx.save();
      if (idx === 0) storyDetail(ctx, rect, 'sign', scale);
      if (idx === 3) storyDetail(ctx, rect, 'plate', scale);
      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = Math.max(2, 3 * scale);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
  });

  // ---- title block ----
  const ty = contentH;
  // Hard offset drop shadow.
  let fontPx = Math.round(titleH * 0.58);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const setTitleFont = (px) => { ctx.font = `${px}px Anton, 'Arial Black', sans-serif`; };
  setTitleFont(fontPx);
  const maxTitleW = W * 0.88;
  const title = (state.title || 'PALM HEAT').toUpperCase();
  while (fontPx > 20 && ctx.measureText(title).width > maxTitleW) {
    fontPx -= 4;
    setTitleFont(fontPx);
  }
  const titleY = ty + titleH * 0.68;
  const titleX = Math.round(W * 0.045);
  ctx.save();
  ctx.translate(Math.round(5 * scale) + 2, Math.round(5 * scale) + 2);
  ctx.fillStyle = '#000000';
  ctx.fillText(title, titleX, titleY);
  ctx.restore();
  // Thick black outline first, then gradient fill (paint-order: stroke).
  const grad = ctx.createLinearGradient(0, titleY - fontPx, 0, titleY + fontPx * 0.2);
  grad.addColorStop(0, grade.titleGradient[0]);
  grad.addColorStop(1, grade.titleGradient[1]);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, Math.round(8 * scale));
  ctx.strokeStyle = '#000000';
  ctx.strokeText(title, titleX, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(title, titleX, titleY);

  // Neon script subtitle under the title.
  const subPx = Math.max(14, Math.round(titleH * 0.26));
  ctx.font = `${subPx}px Pacifico, cursive`;
  ctx.fillStyle = grade.subtitle;
  ctx.shadowColor = grade.subtitle;
  ctx.shadowBlur = Math.round(12 * scale);
  ctx.fillText(state.subtitle || '', titleX + 4, ty + titleH * 0.94);
  ctx.shadowBlur = 0;

  // Five-star heat meter, top-right of the title band.
  const starR = Math.max(8, Math.round(titleH * 0.15));
  const starY = ty + titleH * 0.26;
  for (let s = 0; s < 5; s++) {
    drawStar(ctx, W - Math.round(W * 0.045) - s * starR * 2.4 - starR, starY, starR, '#ffd76a');
  }

  // WANTED badge, tilted, bottom-right.
  const badgeW = Math.round(W * 0.16);
  const badgeH = Math.round(titleH * 0.34);
  const bx = W - badgeW - Math.round(W * 0.045);
  const by = ty + titleH * 0.58;
  ctx.save();
  ctx.translate(bx + badgeW / 2, by + badgeH / 2);
  ctx.rotate((-5 * Math.PI) / 180);
  ctx.fillStyle = grade.badge;
  ctx.fillRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(badgeH * 0.52)}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WANTED', 0, 1);
  ctx.restore();

  // Grain + vignette over everything.
  if (state.grain !== false) grainTile(ctx, W, H);
  if (state.vignette !== false) {
    const vg = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}
