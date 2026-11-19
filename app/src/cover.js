// Cover renderer — draws one GTA-style poster onto a canvas: five inked panels
// in a hero-led grid plus a title block. Everything is drawn from the photos
// themselves (no Rockstar art, logo or font): Anton + Pacifico under the OFL.
//
// Framing is the whole point of v2.1. Every sample photo carries a focus
// point and a "safe box" (head + shoulders) measured from the actual photo:
// the crop is centred on the focus and shifted to contain the safe box, and
// if a panel is too short to hold it the photo is letterboxed instead of
// cutting the face. Dark photos carry a shadow lift so no panel crushes black.

import { inkImageData, fitPhotoToPanel, clamp, mulberry32 } from './ink.js';
import { gradeById } from './grades.js';
import { layoutPanels } from './layouts.js';

// Focus/safe measured from the real photos (0..1 photo coords):
// boulevard: woman by the red convertible, face upper-centre, head+shoulders
//   y 0.04..0.48. pier: fisherman, face upper-centre. car: person in black
//   holding a vintage camera, head already cropped by the source photo —
//   focus the hands+camera (the bright part). neon: mountain ridge above
//   clouds, hikers lower-centre. skyline: foggy sunset, the only colour is
//   the pink cloud band at the top — focus there, never the empty mist.
// crowd: dark golden-hour park, lone figure mid-frame, sunlit trees.
export const SAMPLES = [
  { id: 'boulevard', file: 'samples/boulevard.jpg', focus: { x: 0.55, y: 0.22 }, safe: { x: 0.28, y: 0.04, w: 0.57, h: 0.44 }, lift: 1.0 },
  { id: 'pier', file: 'samples/pier.jpg', focus: { x: 0.42, y: 0.25 }, safe: { x: 0.15, y: 0.05, w: 0.6, h: 0.5 }, lift: 1.0 },
  { id: 'car', file: 'samples/car.jpg', focus: { x: 0.5, y: 0.45 }, safe: { x: 0.3, y: 0.25, w: 0.45, h: 0.4 }, lift: 1.35 },
  { id: 'neon', file: 'samples/neon.jpg', focus: { x: 0.35, y: 0.45 }, safe: { x: 0.05, y: 0.25, w: 0.9, h: 0.6 }, lift: 1.0 },
  { id: 'skyline', file: 'samples/skyline.jpg', focus: { x: 0.5, y: 0.22 }, safe: { x: 0.05, y: 0.05, w: 0.9, h: 0.35 }, lift: 1.0 },
  { id: 'crowd', file: 'samples/crowd.jpg', focus: { x: 0.5, y: 0.42 }, safe: { x: 0.2, y: 0.25, w: 0.6, h: 0.45 }, lift: 1.3 },
];

export const DEFAULT_COVER_PHOTOS = ['boulevard', 'pier', 'car', 'neon', 'skyline'];

export function sampleById(id) {
  return SAMPLES.find((s) => s.id === id) || SAMPLES[0];
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${url}`));
    img.src = url;
  });
}

// Cache of inked panels: key `${sampleId}|${w}x${h}|${gradeId}` -> offscreen canvas.
const inkCache = new Map();

function inkedPanel(photo, panelW, panelH, grade) {
  const pan = photo.pan || { x: 0, y: 0 };
  const zoom = photo.zoom || 1;
  const lift = photo.lift ?? photo.sample.lift;
  const key = `${photo.sample.id}|${panelW}x${panelH}|${grade.id}|${lift}|${pan.x.toFixed(2)},${pan.y.toFixed(2)}|${zoom.toFixed(2)}`;
  const hit = inkCache.get(key);
  if (hit) return hit;
  // Drag pans the focus; scroll zooms the crop window tighter around it.
  const focus = {
    x: clamp(photo.sample.focus.x + pan.x, 0, 1),
    y: clamp(photo.sample.focus.y + pan.y, 0, 1),
  };
  const fit = fitPhotoToPanel(
    photo.img.naturalWidth, photo.img.naturalHeight,
    panelW * zoom, panelH * zoom, focus, photo.sample.safe,
  );
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(panelW));
  off.height = Math.max(2, Math.round(panelH));
  const octx = off.getContext('2d');
  octx.fillStyle = grade.palette[4];
  octx.fillRect(0, 0, off.width, off.height);
  const tmp = document.createElement('canvas');
  tmp.width = off.width;
  tmp.height = off.height;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(photo.img, fit.sx, fit.sy, fit.sw, fit.sh, fit.dx, fit.dy, fit.dw, fit.dh);
  const raw = tctx.getImageData(0, 0, tmp.width, tmp.height);
  const inked = inkImageData(raw, {
    palette: grade.palette,
    ink: grade.ink,
    lift,
    inkThreshold: 90,
    inkWidth: 1,
    halftoneCell: grade.halftoneCell,
    halftoneMax: grade.halftoneMax,
    grainSeed: 7,
    grainAmount: 14,
  });
  const out = octx.createImageData(off.width, off.height);
  out.data.set(inked.data);
  octx.putImageData(out, 0, 0);
  if (inkCache.size > 40) inkCache.clear();
  inkCache.set(key, off);
  return off;
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.strokeStyle = '#111111';
  ctx.stroke();
}

function drawSign(ctx, x, y, w, h, text, bg, fg, font) {
  ctx.save();
  ctx.fillStyle = bg;
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = Math.max(1, h * 0.08);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h * 0.25);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + h * 0.04);
  ctx.restore();
}

/**
 * Renders a full cover onto `canvas` at its own pixel size.
 * scene: { photos: [{ img, sample, lift? }], caption, subtitle,
 *          layoutId, gradeId }
 * photos are assigned to panels in order: hero first, then a, b, c, d.
 */
export function renderCover(canvas, scene) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = gradeById(scene.gradeId);
  const titleH = Math.round(H * (W > H ? 0.21 : 0.16));
  const panelH = H - titleH;
  const gap = Math.max(4, Math.round(W * 0.006));

  ctx.fillStyle = '#14081F';
  ctx.fillRect(0, 0, W, H);

  const panels = layoutPanels(scene.layoutId, W, panelH, gap);
  const photos = scene.photos && scene.photos.length ? scene.photos : [];
  panels.forEach((panel, i) => {
    const photo = photos[i % Math.max(1, photos.length)];
    if (!photo) return;
    const art = inkedPanel(photo, panel.w, panel.h, grade);
    ctx.save();
    if (panel.rot) {
      ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
      ctx.rotate((panel.rot * Math.PI) / 180);
      ctx.drawImage(art, -panel.w / 2, -panel.h / 2, panel.w, panel.h);
      ctx.lineWidth = Math.max(3, W * 0.004);
      ctx.strokeStyle = '#111111';
      ctx.strokeRect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(-panel.w / 2 + 3, -panel.h / 2 + 3, panel.w - 6, panel.h - 6);
      ctx.restore();
    } else {
      ctx.drawImage(art, panel.x, panel.y, panel.w, panel.h);
      ctx.lineWidth = Math.max(3, W * 0.004);
      ctx.strokeStyle = '#111111';
      ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(panel.x + 3, panel.y + 3, panel.w - 6, panel.h - 6);
      ctx.restore();
    }
  });

  // Story details, drawn into the panels like Bliss's hidden signatures.
  const hero = panels.find((p) => p.role === 'hero');
  if (hero) {
    const sw = Math.min(hero.w * 0.34, 170);
    const sh = Math.max(14, titleH * 0.14);
    drawSign(ctx, hero.x + hero.w - sw - 10, hero.y + 10, sw, sh, 'OCEAN DR', '#1E7A34', '#FFFFFF', `bold ${Math.round(sh * 0.52)}px sans-serif`);
  }
  const last = panels[panels.length - 1];
  if (last) {
    const pw = Math.min(last.w * 0.4, 150);
    const ph = Math.max(14, titleH * 0.14);
    drawSign(ctx, last.x + 10, last.y + last.h - ph - 10, pw, ph, 'LEONIDA', '#F5F2EA', '#111111', `bold ${Math.round(ph * 0.52)}px sans-serif`);
  }

  drawTitleBlock(ctx, W, H, titleH, scene.caption, scene.subtitle, grade);
  drawVignette(ctx, W, H);
  return canvas;
}

function drawTitleBlock(ctx, W, H, titleH, caption, subtitle, grade) {
  const y0 = H - titleH;
  ctx.fillStyle = '#14081F';
  ctx.fillRect(0, y0, W, titleH);

  const text = (caption || 'PALM HEAT').trim().toUpperCase();
  let size = Math.round(titleH * 0.52);
  ctx.font = `${size}px Anton, sans-serif`;
  const maxW = W * 0.6;
  while (ctx.measureText(text).width > maxW && size > 16) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  const tx = Math.round(W * 0.04);
  const ty = y0 + Math.round(titleH * 0.62);
  // Hard offset shadow, then thick black stroke, then gradient fill.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000000';
  ctx.fillText(text, tx + size * 0.06, ty + size * 0.06);
  ctx.lineWidth = Math.max(3, Math.round(size / 14));
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#111111';
  ctx.strokeText(text, tx, ty);
  const grad = ctx.createLinearGradient(0, ty - size, 0, ty);
  grad.addColorStop(0, '#FFF7D6');
  grad.addColorStop(0.55, '#FFD76B');
  grad.addColorStop(1, '#FF8A3D');
  ctx.fillStyle = grad;
  ctx.fillText(text, tx, ty);

  // Neon script subtitle under the title.
  const sub = (subtitle || 'a sunset story in Leonida').trim();
  if (sub) {
    const ssize = Math.round(titleH * 0.24);
    ctx.font = `${ssize}px Pacifico, cursive`;
    ctx.fillStyle = '#7DF9FF';
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = Math.round(ssize * 0.5);
    ctx.fillText(sub, tx + 4, y0 + Math.round(titleH * 0.92));
    ctx.shadowBlur = 0;
  }

  // Five-star heat meter + WANTED badge, right side.
  const starR = Math.round(titleH * 0.15);
  const starsW = starR * 2 * 5 + starR * 0.8 * 4;
  let sx = W - Math.round(W * 0.04) - starsW;
  const sy = y0 + Math.round(titleH * 0.3);
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, sx + starR + i * (starR * 2 + starR * 0.8), sy, starR, '#FFC94D');
  }
  const bw = Math.round(W * 0.13);
  const bh = Math.round(titleH * 0.3);
  const bx = W - Math.round(W * 0.04) - bw;
  const by = y0 + Math.round(titleH * 0.58);
  ctx.save();
  ctx.translate(bx + bw / 2, by + bh / 2);
  ctx.rotate((-3 * Math.PI) / 180);
  ctx.fillStyle = '#FF2E63';
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.lineWidth = Math.max(2, bh * 0.06);
  ctx.strokeStyle = '#111111';
  ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${Math.round(bh * 0.52)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WANTED', 0, bh * 0.04);
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // A whisper of paper grain over the whole cover.
  const rng = mulberry32(11);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(rng() * W, rng() * H, 1.5, 1.5);
  }
}
