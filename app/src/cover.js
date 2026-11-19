// Draws the whole cover onto a 2D context at any size: panels, gradient-map
// grade, title block with Anton caption + Pacifico subtitle, heat-meter stars,
// badge ribbon, grain and vignette. Pure function of (ctx, W, H, state, images)
// so the preview and the exported PNG are the same drawing.
import { buildGradeLUT, applyGradeLUT } from './grades.js';
import { layoutPanels, titleBandHeight } from './layouts.js';

const lutCache = new Map();
function lutFor(gradeId) {
  if (!lutCache.has(gradeId)) lutCache.set(gradeId, buildGradeLUT(gradeId));
  return lutCache.get(gradeId);
}

let noiseTile = null;
function grainTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = seed % 256;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

/** Renders one photo into a panel-sized canvas, cover-fit with zoom/pan, graded. */
export function renderPanelImage(img, panel, slot, lut) {
  const w = Math.max(2, Math.round(panel.w));
  const h = Math.max(2, Math.round(panel.h));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#241a33';
  g.fillRect(0, 0, w, h);
  if (img) {
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const scale = base * (slot.zoom || 1);
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    // ox/oy are focus positions in [-0.5, 0.5]: 0 centres the photo, +0.5
    // shows its top (or left) edge. Layout-independent, so the same focus
    // keeps a face in frame in a wide hero panel and a square one alike.
    const ox = Math.min(0.5, Math.max(-0.5, slot.ox || 0));
    const oy = Math.min(0.5, Math.max(-0.5, slot.oy || 0));
    const dx = pw > w ? -(pw - w) * (0.5 - ox) : (w - pw) / 2;
    const dy = ph > h ? -(ph - h) * (0.5 - oy) : (h - ph) / 2;
    g.drawImage(img, dx, dy, pw, ph);
  }
  const data = g.getImageData(0, 0, w, h);
  applyGradeLUT(data, lut);
  g.putImageData(data, 0, 0);
  return c;
}

function fitCaptionFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

/** The title block: gradient band, Anton caption, Pacifico subtitle, stars, badge. */
export function drawTitleBlock(ctx, W, H, state) {
  const bandH = titleBandHeight(H);
  const bandY = H - bandH;
  const grad = ctx.createLinearGradient(0, bandY - H * 0.06, 0, H);
  grad.addColorStop(0, 'rgba(12, 4, 28, 0)');
  grad.addColorStop(0.35, 'rgba(12, 4, 28, 0.82)');
  grad.addColorStop(1, 'rgba(12, 4, 28, 0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, bandY - H * 0.06, W, bandH + H * 0.06);

  const pad = Math.round(W * 0.045);
  const caption = (state.caption || 'PALM HEAT').trim().toUpperCase() || 'PALM HEAT';
  const sub = (state.subtitle || '').trim();

  // Caption in a sunset gradient with a dark inked outline, fitted to leave
  // room for the heat-meter stars at the top right of the band.
  const stars = Math.min(5, Math.max(0, state.stars || 0));
  const starSize = Math.round(bandH * 0.22);
  let starText = '';
  for (let i = 0; i < 5; i++) starText += i < stars ? '★' : '☆';
  ctx.font = `${starSize}px sans-serif`;
  const starsW = stars ? ctx.measureText(starText).width : 0;
  const capSize = fitCaptionFont(ctx, caption, W - pad * 2 - starsW - Math.round(W * 0.03), Math.round(bandH * 0.52));
  const capY = bandY + bandH * 0.52;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const fill = ctx.createLinearGradient(pad, capY - capSize / 2, pad, capY + capSize / 2);
  fill.addColorStop(0, '#fff7d6');
  fill.addColorStop(0.45, '#ffb347');
  fill.addColorStop(1, '#ff2e88');
  ctx.font = `${capSize}px Anton, sans-serif`;
  ctx.strokeStyle = 'rgba(10, 2, 24, 0.9)';
  ctx.lineWidth = Math.max(2, capSize * 0.09);
  ctx.strokeText(caption, pad, capY);
  ctx.fillStyle = fill;
  ctx.fillText(caption, pad, capY);

  // Neon script subtitle.
  if (sub) {
    const subSize = Math.max(16, Math.round(bandH * 0.20));
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#7df9ff';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = subSize * 0.45;
    ctx.fillText(sub, pad + 2, bandY + bandH * 0.82);
    ctx.shadowBlur = 0;
  }

  // Heat-meter stars, top right of the band.
  ctx.font = `${starSize}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ff7a18';
  ctx.shadowBlur = starSize * 0.3;
  ctx.fillText(starText, W - pad, bandY + bandH * 0.30);
  ctx.shadowBlur = 0;

  // Badge ribbon.
  const badge = (state.badge || '').trim();
  if (badge) {
    const bSize = Math.max(14, Math.round(bandH * 0.16));
    ctx.font = `bold ${bSize}px sans-serif`;
    const bw = ctx.measureText(badge).width + bSize * 1.6;
    const bh = bSize * 2.1;
    const bx = W - pad - bw;
    const by = bandY + bandH * 0.58;
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.rotate(-0.03);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(badge.toUpperCase(), 0, 1);
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

/** Draws the full cover. `images` maps photo id -> HTMLImageElement (or null). */
export function drawCover(ctx, W, H, state, images) {
  ctx.clearRect(0, 0, W, H);
  const lut = lutFor(state.grade || 'sunset');
  const isTilted = state.layout === 'tilted';
  if (isTilted) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#2b0f54');
    bg.addColorStop(0.55, '#c22e6e');
    bg.addColorStop(1, '#ff7a18');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#12081f';
    ctx.fillRect(0, 0, W, H);
  }

  const panels = layoutPanels(state.layout || 'grid4', W, H);
  const slots = state.panels || [];
  const border = Math.max(2, Math.round(Math.min(W, H) * 0.006));
  panels.forEach((panel, i) => {
    const slot = slots[i] || { photo: 'boulevard', zoom: 1, ox: 0, oy: 0 };
    const img = images ? images[slot.photo] || null : null;
    const graded = renderPanelImage(img, panel, slot, lut);
    ctx.save();
    if (panel.rot) {
      ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
      ctx.rotate(panel.rot);
      ctx.translate(-panel.w / 2, -panel.h / 2);
    } else {
      ctx.translate(panel.x, panel.y);
    }
    if (isTilted) {
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = Math.round(W * 0.02);
      ctx.shadowOffsetY = Math.round(H * 0.012);
    }
    ctx.drawImage(graded, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = border;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(border / 2, border / 2, panel.w - border, panel.h - border);
    ctx.lineWidth = Math.max(1, border / 2);
    ctx.strokeStyle = 'rgba(10,2,24,0.85)';
    ctx.strokeRect(border * 1.5, border * 1.5, panel.w - border * 3, panel.h - border * 3);
    ctx.restore();
  });

  drawTitleBlock(ctx, W, H, state);

  if (state.vignette !== false) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.grain !== false) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    const tile = grainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
