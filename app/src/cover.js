// Palm Heat Cover Studio — cover.js
// The comic-ink render pipeline (the heart of v2) + the cover composer.
//
// Pipeline per panel, all in plain canvas pixel code, no libraries:
//   1. face-safe crop (never cut through a head — v2.1 fix)
//   2. Sobel edge detect -> thick black ink outlines (dilated 3x3)
//   3. posterize luminance to 5 tones
//   4. halftone dot screen in the two darkest tones
//   5. grade palette map (tone -> palette step) + paper grain
// Then the title block (Anton, stroked, hard shadow), the Pacifico neon
// subtitle, the WANTED badge, the 5-star heat meter and the small-print
// story details (street sign, plate) are drawn over the panels.
//
// Pure helpers are exported for the Node tests; renderCover needs a DOM
// canvas, so it only runs in the browser.

import { gradeById, posterizeTone, luminance, halftoneLightens, hexToRgb } from './grades.js';
import { layoutPanels, layoutById } from './layouts.js';

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Face-safe cover-fit crop window into the source image.
// (fx, fy) is the focal point in 0..1 photo coordinates. The window is
// centred on the focal point, then clamped inside the photo. Face-safe
// rule: when the focal point sits in the upper part of the photo (a head),
// the window is never allowed to start below the face — it is pulled up so
// eyes, nose and mouth stay in frame (v2.1 fix: the cropped hero face).
export function cropWindow(imgW, imgH, panelW, panelH, fx, fy, zoom = 1) {
  const scale = Math.max(panelW / imgW, panelH / imgH) * zoom;
  const sw = panelW / scale;
  const sh = panelH / scale;
  let sx = fx * imgW - sw / 2;
  let sy = fy * imgH - sh / 2;
  if (fy < 0.4) sy = Math.min(sy, fy * imgH - sh * 0.18);
  sx = clamp(sx, 0, imgW - sw);
  sy = clamp(sy, 0, imgH - sh);
  return { sx, sy, sw, sh };
}

// Sobel gradient magnitude at (x, y) of a grayscale plane (0..255).
export function sobelAt(gray, w, h, x, y) {
  const at = (xx, yy) => {
    const cx = clamp(xx, 0, w - 1);
    const cy = clamp(yy, 0, h - 1);
    return gray[cy * w + cx];
  };
  const gx =
    -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) +
    at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
  const gy =
    -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) +
    at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
  return Math.sqrt(gx * gx + gy * gy);
}

// Deterministic paper-grain offset for a pixel, -amount..+amount.
export function grainAt(x, y, amount) {
  const n = ((x * 374761393 + y * 668265263) ^ 0x5bf03635) >>> 0;
  return (((n % 21) - 10) / 10) * amount;
}

// Ink one panel image into an offscreen canvas of panelW x panelH and
// return it. `lift` raises the darkest band (dark photos stay readable).
export function inkPanel(image, panelW, panelH, grade, focal, zoom = 1, lift = 0) {
  const w = Math.max(2, Math.round(panelW));
  const h = Math.max(2, Math.round(panelH));
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  const cw = cropWindow(image.naturalWidth, image.naturalHeight, w, h, focal.x, focal.y, zoom);
  octx.drawImage(image, cw.sx, cw.sy, cw.sw, cw.sh, 0, 0, w, h);

  const src = octx.getImageData(0, 0, w, h);
  const data = src.data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  }
  // Edge magnitudes, then a 3x3 dilation so outlines read thick, like ink.
  const edge = new Float32Array(w * h);
  const EDGE = 72;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) edge[y * w + x] = sobelAt(gray, w, h, x, y);
  }
  const inkRgb = hexToRgb(grade.ink);
  const pal = grade.palette.map(hexToRgb);
  const totalLift = Math.min(0.25, lift + grade.shadowLift);
  const out = octx.createImageData(w, h);
  const od = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let isEdge = edge[i] > EDGE;
      if (!isEdge) {
        for (let dy = -1; dy <= 1 && !isEdge; dy++) {
          for (let dx = -1; dx <= 1 && !isEdge; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && edge[ny * w + nx] > EDGE) isEdge = true;
          }
        }
      }
      let tone = posterizeTone(gray[i], totalLift);
      if (!isEdge && halftoneLightens(tone, x, y, grade.halftone)) tone = Math.min(4, tone + 1);
      const c = isEdge ? inkRgb : pal[tone];
      const g = grainAt(x, y, grade.grain);
      const o = i * 4;
      od[o] = clamp(c[0] + g, 0, 255);
      od[o + 1] = clamp(c[1] + g, 0, 255);
      od[o + 2] = clamp(c[2] + g, 0, 255);
      od[o + 3] = 255;
    }
  }
  octx.putImageData(out, 0, 0);
  return off;
}

// ---- title block + story details -----------------------------------------

function drawTitle(ctx, W, H, caption, subtitle, grade) {
  const M = 28;
  let size = Math.round(H * 0.115);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  const textW = ctx.measureText(caption).width;
  const maxW = W - 2 * M - 40;
  if (textW > maxW) {
    size = Math.floor((size * maxW) / textW);
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  }
  const cx = W / 2;
  const baseY = H * 0.87;
  const grad = ctx.createLinearGradient(0, baseY - size, 0, baseY);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#ffe9b0');
  grad.addColorStop(1, '#ffb52e');
  // Hard offset drop shadow (drawn first, no blur — pulp-poster style).
  ctx.fillStyle = '#000000';
  ctx.fillText(caption, cx + 8, baseY + 8);
  // Thick black stroke, then the gradient fill on top (paint-order: stroke).
  ctx.lineWidth = Math.max(6, Math.round(size * 0.055));
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000000';
  ctx.strokeText(caption, cx, baseY);
  ctx.fillStyle = grad;
  ctx.fillText(caption, cx, baseY);

  // Pacifico neon subtitle.
  const subSize = Math.round(size * 0.34);
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = grade.glow;
  ctx.fillText(subtitle, cx, baseY + subSize + 14);
  ctx.shadowBlur = 0;

  // 5-star heat meter under the subtitle.
  const starY = baseY + subSize + 40;
  const starR = Math.round(size * 0.09);
  drawStars(ctx, cx, starY, starR, 5);
}

function drawStars(ctx, cx, y, r, count) {
  const gap = r * 2.6;
  const x0 = cx - ((count - 1) * gap) / 2;
  ctx.save();
  ctx.fillStyle = '#ffd21f';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  for (let i = 0; i < count; i++) {
    star(ctx, x0 + i * gap, y, r, r * 0.45);
  }
  ctx.restore();
}

function star(ctx, cx, cy, rOuter, rInner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawWantedBadge(ctx, W, grade) {
  const bw = Math.round(W * 0.16);
  const bh = Math.round(bw * 0.42);
  const x = W - 28 - bw;
  const y = 34;
  ctx.save();
  ctx.translate(x + bw / 2, y + bh / 2);
  ctx.rotate(-0.06);
  ctx.fillStyle = '#f5e6c8';
  ctx.strokeStyle = '#160709';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.rect(-bw / 2, -bh / 2, bw, bh);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#a31212';
  ctx.font = `${Math.round(bh * 0.42)}px Anton, "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WANTED', 0, 2);
  ctx.restore();
}

function drawStreetSign(ctx, panel) {
  const s = Math.max(10, Math.round(panel.w * 0.055));
  const x = panel.x + 14;
  const y = panel.y + 14;
  ctx.save();
  ctx.fillStyle = '#1d6b34';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.font = `${s}px Anton, "Arial Black", sans-serif`;
  const label = 'OCEAN DR';
  const tw = ctx.measureText(label).width;
  ctx.beginPath();
  ctx.rect(x, y, tw + 18, s + 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 9, y + (s + 12) / 2 + 1);
  ctx.restore();
}

function drawPlate(ctx, panel) {
  const s = Math.max(9, Math.round(panel.w * 0.05));
  ctx.save();
  ctx.font = `${s}px Anton, "Arial Black", sans-serif`;
  const label = 'LEONIDA';
  const tw = ctx.measureText(label).width;
  const pw = tw + 20;
  const ph = s + 12;
  // Bottom-right corner: with the v2.1 title metrics (stars end above it)
  // it clears both the title and the star row in every layout.
  const x = panel.x + panel.w - pw - 12;
  const y = panel.y + panel.h - ph - 12;
  ctx.fillStyle = '#f2f2e8';
  ctx.strokeStyle = '#1c1c1c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(x, y, pw, ph);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1c4d8f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + pw / 2, y + ph / 2 + 1);
  ctx.restore();
}

let noisePattern = null;
function grainPattern(ctx) {
  if (noisePattern) return noisePattern;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const cc = c.getContext('2d');
  const img = cc.createImageData(128, 128);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = seed % 256;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 18;
  }
  cc.putImageData(img, 0, 0);
  noisePattern = ctx.createPattern(c, 'repeat');
  return noisePattern;
}

// ---- the composer ----------------------------------------------------------

// state: { caption, subtitle, grade, layout, panels: [{photo, fx, fy, zoom, lift}] }
// images: Map photo id -> HTMLImageElement (already loaded).
// The canvas is sized by the caller; the layout's native rects are scaled.
export function renderCover(canvas, images, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = gradeById(state.grade);
  const layout = layoutById(state.layout);
  const scale = Math.min(W / layout.w, H / layout.h);
  const ox = (W - layout.w * scale) / 2;
  const oy = (H - layout.h * scale) / 2;

  // Paper background.
  ctx.fillStyle = '#f7ead0';
  ctx.fillRect(0, 0, W, H);

  const panels = layoutPanels(state.layout);
  panels.forEach((p, i) => {
    const spec = state.panels[i % state.panels.length];
    const img = images.get(spec.photo);
    if (!img) return;
    const px = ox + p.x * scale;
    const py = oy + p.y * scale;
    const pw = p.w * scale;
    const ph = p.h * scale;
    ctx.save();
    if (p.tilt) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate(p.tilt);
      ctx.translate(-pw / 2, -ph / 2);
      ctx.fillStyle = '#fdf6e3';
      ctx.fillRect(-(p.border ?? 0), -(p.border ?? 0), pw + 2 * (p.border ?? 0), ph + 2 * (p.border ?? 0));
    } else {
      ctx.translate(px, py);
    }
    const inked = inkPanel(img, pw, ph, grade, { x: spec.fx, y: spec.fy }, spec.zoom ?? 1, spec.lift ?? 0);
    ctx.drawImage(inked, 0, 0);
    // Heavy black comic frame.
    ctx.lineWidth = Math.max(3, Math.round(5 * scale));
    ctx.strokeStyle = '#0d0508';
    ctx.strokeRect(0, 0, pw, ph);
    // Story details, drawn into the panels.
    if (p.role === 'hero') drawStreetSign(ctx, { x: 0, y: 0, w: pw, h: ph });
    if (spec.photo === 'car') drawPlate(ctx, { x: 0, y: 0, w: pw, h: ph });
    ctx.restore();
  });

  // Vignette: darkened corners pull the eye to the hero.
  const vg = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,4,8,0.30)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Paper grain over the whole poster.
  const pat = grainPattern(ctx);
  if (pat) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawWantedBadge(ctx, W, grade);
  drawTitle(ctx, W, H, state.caption, state.subtitle, grade);
  return canvas;
}
