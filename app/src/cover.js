// cover.js — the Leonida Nights cover renderer (2D canvas, no DOM at import).
// Clean photographic render: photos are drawn with a cover-fit crop and a
// gentle grade only. No posterize, no halftone, no ink outlines — v3 drops
// the v2.1 comic-ink pipeline. The hero panel pops OUT of its cell (expanded
// ~24px, soft edge, drop shadow, white keyline) and the striped retro-chrome
// 3D title sits OVER the art on a scrim, with the 5-star heat meter placed
// bottom-up so the stars always have >= 36px of clear space below them.

import { applyGrade, drawGrain, gradeById } from './grades.js';
import {
  layoutPanels, coverFitRect, titleBlockGeometry, fitTitleSize,
  HERO_FOCUS, PANEL_FOCUS,
} from './layouts.js';

export const SAMPLE_PHOTOS = [
  { id: 'hero', src: 'samples/hero.jpg', label: 'Lucia Portrait' },
  { id: 'sunset', src: 'samples/sunset.jpg', label: 'Sunset Pier' },
  { id: 'neon', src: 'samples/neon.jpg', label: 'Neon Stage' },
  { id: 'palms', src: 'samples/palms.jpg', label: 'Golden Street' },
  { id: 'ocean', src: 'samples/ocean.jpg', label: 'Ocean Waves' },
  { id: 'strip', src: 'samples/strip.jpg', label: 'Sunglasses Hour' },
];

export function defaultState() {
  return {
    title: 'LEONIDA NIGHTS',
    subtitle: 'Vice City Nights',
    layout: 'hero-led',
    grade: 'vice-sunset',
    grain: true,
    vignette: true,
    // One entry per panel slot; photo indexes into SAMPLE_PHOTOS (or the
    // user's uploaded photos). Default cover: 5 DIFFERENT photos.
    panels: [
      { photo: 0, zoom: 1, panX: 0, panY: 0, flip: false, tag: 'LUCIA' },
      { photo: 1, zoom: 1, panX: 0, panY: 0, flip: false, tag: 'JASON' },
      { photo: 2, zoom: 1, panX: 0, panY: 0, flip: false, tag: 'NEON' },
      { photo: 3, zoom: 1, panX: 0, panY: 0, flip: false, tag: 'OCEAN DR' },
      { photo: 4, zoom: 1, panX: 0, panY: 0, flip: false, tag: 'LEONIDA' },
    ],
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function slantPath(ctx, x, y, w, h, slant) {
  const s = w * slant;
  ctx.beginPath();
  ctx.moveTo(x + s, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - s, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function clipPanel(ctx, panel) {
  if (panel.slant) slantPath(ctx, panel.x, panel.y, panel.w, panel.h, panel.slant);
  else roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, Math.min(14, panel.w * 0.03));
  ctx.clip();
}

function drawStar(ctx, cx, cy, r, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.lineWidth = Math.max(1, r * 0.08); ctx.strokeStyle = stroke; ctx.stroke(); }
}

function drawTag(ctx, panel, tag, scale) {
  if (!tag) return;
  const fs = Math.max(11, Math.round(15 * scale));
  ctx.save();
  ctx.font = `700 ${fs}px Arial, sans-serif`;
  const pad = fs * 0.55;
  const tw = ctx.measureText(tag).width + pad * 2;
  const tx = panel.x + Math.max(8, panel.w * 0.04);
  const ty = panel.y + Math.max(8, panel.h * 0.04);
  ctx.fillStyle = 'rgba(10,6,24,0.78)';
  roundRectPath(ctx, tx, ty, tw, fs * 1.7, fs * 0.85);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(tag, tx + pad, ty + fs * 0.88);
  ctx.restore();
}

function drawStoryDetail(ctx, panel, tag, scale) {
  if (panel.w < 130 || !tag) return;
  const fs = Math.max(10, Math.round(12 * scale));
  ctx.save();
  ctx.font = `700 ${fs}px Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const bx = panel.x + Math.max(8, panel.w * 0.04);
  const by = panel.y + panel.h - Math.max(10, panel.h * 0.05) - fs * 0.9;
  if (tag === 'OCEAN DR') {
    const w = ctx.measureText('OCEAN DR').width + fs * 1.2;
    ctx.fillStyle = '#0d5c33';
    roundRectPath(ctx, bx, by, w, fs * 1.8, 3);
    ctx.fill();
    ctx.strokeStyle = '#e8f5ec'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('OCEAN DR', bx + fs * 0.6, by + fs * 0.92);
  } else if (tag === 'LEONIDA') {
    const w = ctx.measureText('LEONIDA').width + fs * 1.2;
    ctx.fillStyle = '#f2ede0';
    roundRectPath(ctx, bx, by, w, fs * 1.8, 3);
    ctx.fill();
    ctx.strokeStyle = '#1c2a4a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1c2a4a';
    ctx.fillText('LEONIDA', bx + fs * 0.6, by + fs * 0.92);
  }
  ctx.restore();
}

function drawPhotoInto(ctx, img, panel, pstate, grade) {
  const focus = panel.hero ? HERO_FOCUS : PANEL_FOCUS;
  const fx = Math.min(0.95, Math.max(0.05, focus.x + (pstate.panX || 0)));
  const fy = Math.min(0.95, Math.max(0.05, focus.y + (pstate.panY || 0)));
  const src = coverFitRect(img.naturalWidth || img.width, img.naturalHeight || img.height,
    panel.w, panel.h, fx, fy, pstate.zoom || 1);
  ctx.save();
  ctx.filter = `saturate(${grade.saturation}) brightness(${grade.brightness})`;
  if (pstate.flip) {
    ctx.translate(panel.x + panel.w, panel.y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, src.sx, src.sy, src.sw, src.sh, 0, 0, panel.w, panel.h);
  } else {
    ctx.drawImage(img, src.sx, src.sy, src.sw, src.sh, panel.x, panel.y, panel.w, panel.h);
  }
  ctx.restore();
  applyGrade(ctx, panel.x, panel.y, panel.w, panel.h, grade);
}

// Draw one panel (photo + grade + tag + story detail). The hero is drawn
// expanded and popped out; callers draw non-hero panels first, hero last.
function drawPanel(ctx, img, panel, pstate, grade, scale, popOut) {
  const p = popOut
    ? { ...panel, x: panel.x - popOut, y: panel.y - popOut, w: panel.w + popOut * 2, h: panel.h + popOut * 2 }
    : panel;
  ctx.save();
  if (popOut) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = popOut * 1.6;
    ctx.shadowOffsetY = popOut * 0.5;
    roundRectPath(ctx, p.x, p.y, p.w, p.h, Math.min(16, p.w * 0.03));
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  clipPanel(ctx, p);
  drawPhotoInto(ctx, img, p, pstate, grade);
  ctx.restore();
  if (popOut) {
    ctx.save();
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    roundRectPath(ctx, p.x, p.y, p.w, p.h, Math.min(16, p.w * 0.03));
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    clipPanel(ctx, panel);
    ctx.stroke();
    ctx.restore();
  }
  drawTag(ctx, p, pstate.tag, scale);
  drawStoryDetail(ctx, p, pstate.tag, scale);
}

function drawTitleBlock(ctx, W, H, state) {
  const g = titleBlockGeometry(W, H);
  const scale = Math.min(W, H) / 1080;
  ctx.save();
  // Scrim behind the title so it reads over any photo.
  const scrim = ctx.createLinearGradient(0, g.scrimTop, 0, H);
  scrim.addColorStop(0, 'rgba(8,4,20,0)');
  scrim.addColorStop(0.45, 'rgba(8,4,20,0.45)');
  scrim.addColorStop(1, 'rgba(8,4,20,0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, g.scrimTop, W, H - g.scrimTop);

  // Subtitle: Pacifico neon script above the title.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${g.subSize}px Pacifico, cursive`;
  ctx.shadowColor = '#ff4fd8';
  ctx.shadowBlur = Math.max(8, g.subSize * 0.55);
  ctx.fillStyle = '#fff0fa';
  ctx.fillText(state.subtitle, W / 2, g.subY);
  ctx.shadowBlur = 0;

  // Title: Anton, white-to-gold gradient, horizontal chrome stripes,
  // dark outline + 3D extrude shadow, over the art. The gradient/stripes are
  // composited on a scratch canvas first, so 'source-atop' only touches the
  // glyphs and never tints the photos behind the title.
  const titleSize = fitTitleSize(ctx, state.title, g.titleSize, W * 0.94);
  const cx = W / 2, by = g.titleY;
  ctx.save();
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // 3D extrude: dark copies stepping down-right.
  ctx.fillStyle = '#1a0b2e';
  for (let i = 5; i >= 1; i--) {
    ctx.fillText(state.title, cx + i * titleSize * 0.018, by + i * titleSize * 0.022);
  }
  const tc = document.createElement('canvas');
  tc.width = W; tc.height = Math.ceil(titleSize * 2.4);
  const t = tc.getContext('2d');
  const ty = titleSize * 1.25; // baseline inside the scratch canvas
  t.font = `${titleSize}px Anton, sans-serif`;
  t.textAlign = 'center';
  t.textBaseline = 'alphabetic';
  t.fillStyle = '#ffffff';
  t.fillText(state.title, cx, ty);
  t.globalCompositeOperation = 'source-atop';
  const grad = t.createLinearGradient(0, ty - titleSize, 0, ty + titleSize * 0.18);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, '#ffe9a8');
  grad.addColorStop(0.75, '#ffd23e');
  grad.addColorStop(1, '#ff8a3c');
  t.fillStyle = grad;
  t.fillRect(0, 0, W, tc.height);
  // Thin horizontal chrome stripes across the letters.
  const stripeH = Math.max(2, titleSize * 0.045);
  t.fillStyle = 'rgba(255,255,255,0.55)';
  for (let y = ty - titleSize * 0.95; y < ty + titleSize * 0.1; y += stripeH * 3.2) {
    t.fillRect(0, y, W, stripeH);
  }
  t.fillStyle = 'rgba(26,11,46,0.28)';
  for (let y = ty - titleSize * 0.95 + stripeH * 1.6; y < ty + titleSize * 0.1; y += stripeH * 3.2) {
    t.fillRect(0, y, W, stripeH * 0.8);
  }
  ctx.drawImage(tc, 0, by - ty);
  // Dark outline (paint-order stroke feel: stroke on top, thin).
  ctx.lineWidth = Math.max(2, titleSize * 0.055);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,8,32,0.92)';
  ctx.strokeText(state.title, cx, by);
  ctx.restore();

  // 5-star heat meter, bottom-up: starsY + starSize leaves >= 36px clear.
  const starGap = g.starSize * 1.5;
  const totalW = 5 * g.starSize + 4 * (starGap - g.starSize);
  let sx = W / 2 - totalW / 2 + g.starSize / 2;
  const cy = g.starsY + g.starSize / 2;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, sx, cy, g.starSize / 2, '#ffd23e', '#7a4d00');
    sx += starGap;
  }

  // WANTED badge, top-right, slightly rotated.
  ctx.save();
  const bw = Math.round(W * 0.13), bh = Math.round(g.starSize * 1.5);
  ctx.translate(W - bw * 0.62, bh * 0.9);
  ctx.rotate(-0.1);
  ctx.fillStyle = '#b3122e';
  roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, 4);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(bh * 0.52)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ WANTED', 0, 1);
  ctx.restore();
}

// Render the full cover into ctx at W x H. `images` maps photo index ->
// loaded HTMLImageElement (or null while loading). Missing photos draw a
// warm placeholder so a panel is never empty or black.
export function renderCover(ctx, W, H, state, images) {
  const grade = gradeById(state.grade);
  const scale = Math.min(W, H) / 1080;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160b26';
  ctx.fillRect(0, 0, W, H);

  const panels = layoutPanels(state.layout, W, H);
  const hero = panels.find((p) => p.hero);
  const rest = panels.filter((p) => !p.hero);
  const popOut = Math.max(14, Math.round(Math.min(W, H) * 0.022));

  const drawOne = (panel, popped) => {
    const pstate = state.panels[panel.photo] || { photo: panel.photo, zoom: 1, panX: 0, panY: 0, flip: false, tag: panel.tag };
    const img = images && images[pstate.photo];
    if (img) {
      drawPanel(ctx, img, panel, pstate, grade, scale, popped ? popOut : 0);
    } else {
      // Warm placeholder: never an empty or nearly-black panel.
      ctx.save();
      clipPanel(ctx, panel);
      const ph = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
      ph.addColorStop(0, '#ff9a5c');
      ph.addColorStop(1, '#7a2d8f');
      ctx.fillStyle = ph;
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
      ctx.restore();
      drawTag(ctx, panel, pstate.tag, scale);
    }
  };
  for (const p of rest) drawOne(p, false);
  if (hero) drawOne(hero, true);

  if (state.grain) drawGrain(ctx, 0, 0, W, H, 0.05);
  drawTitleBlock(ctx, W, H, state);
}

// Render to a fresh canvas and return it (for export).
export function exportCanvas(W, H, state, images) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  renderCover(canvas.getContext('2d'), W, H, state, images);
  return canvas;
}

export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: 'Wide 1920 × 1080' },
];
