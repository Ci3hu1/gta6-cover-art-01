// Leonida Nights Cover Studio v4 — poster renderer.
// Draws the whole magazine cover on a 2D canvas: full-bleed golden-hour
// backdrop, hero-led panel grid, TRUE pop-out hero, striped retro-chrome
// title, and the complete magazine furniture (press band, VOL. pill, gold
// seal, tagline ribbon, billing block + barcode). Pure geometry helpers are
// exported for the node tests; renderPoster needs a browser canvas.

import { gradeById, gradeFilter, rgba } from './grades.js';
import { layoutById, layoutPixelRects, heroFaceBox } from './layouts.js';

// Six bundled sample photos — every one a person at golden hour, verified
// by eye before the build. fx/fy is the face anchor (fractions of the photo)
// the face-aware crop centres on.
export const SAMPLES = [
  { src: 'samples/hero-sunglasses.jpg', role: 'THE DRIVER', location: 'Ocean Drive 6:42 PM', fx: 0.6, fy: 0.32 },
  { src: 'samples/portrait-red-lips.jpg', role: 'THE BOSS', location: 'Leonida Bay 7:15 PM', fx: 0.48, fy: 0.45 },
  { src: 'samples/street-mother.jpg', role: 'THE INSIDER', location: 'Little Havana 5:58 PM', fx: 0.55, fy: 0.3 },
  { src: 'samples/sunset-rider.jpg', role: 'THE RIDER', location: 'Sunset Strip 6:31 PM', fx: 0.72, fy: 0.28 },
  { src: 'samples/golden-profile.jpg', role: 'THE FIXER', location: 'Vice Port 7:02 PM', fx: 0.52, fy: 0.38 },
  { src: 'samples/pier-sitter.jpg', role: 'THE LOOKOUT', location: 'Starfish Pier 6:47 PM', fx: 0.87, fy: 0.4 },
];

export const FRAMES = [
  { id: 'gold', name: 'Twilight Gold', bg: '#241536', border: '#e8b64c', border2: '#8a6420', billing: '#f3e3c0' },
  { id: 'dark', name: 'Dark', bg: '#120a1e', border: '#4a3566', border2: '#2a1d40', billing: '#cfc4e8' },
  { id: 'cream', name: 'Cream', bg: '#f4e8cd', border: '#b98a2f', border2: '#7d5a17', billing: '#4a3410' },
];

export const EXPORT_SIZES = [
  { id: 'wide', name: '1920 × 1080', w: 1920, h: 1080 },
  { id: 'portrait', name: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'square', name: '1080 × 1080', w: 1080, h: 1080 },
];

export function defaultState() {
  return {
    title: 'LEONIDA NIGHTS',
    subtitle: 'Vice City Nights',
    quote: 'PURE LEONIDA MAYHEM',
    paper: 'THE LEONIDA LEDGER',
    volume: 'VOL. 04',
    tagline: 'FIVE LIVES · ONE COAST · NO WAY BACK',
    layoutId: 'popout',
    gradeId: 'golden-hour',
    frameId: 'gold',
    posterInk: false,
    grain: true,
    vignette: true,
    photos: SAMPLES.map((s) => ({ ...s, img: null })),
    // Per-panel overrides keyed by panel id: { photo, zoom, panX, panY, flip }
    overrides: {},
  };
}

export function frameById(id) {
  return FRAMES.find((f) => f.id === id) || FRAMES[0];
}

// ---- geometry (pure, tested) ---------------------------------------------

// Title block is positioned bottom-up; its top edge is fixed at 66% of the
// poster height in every aspect ratio, while every hero face zone ends
// above 40% — so the title can never cover a face.
export function titleGeometry(W, H) {
  const frameInset = Math.round(0.024 * W);
  const bandH = Math.round(0.052 * H);
  const titleTop = 0.66 * H;
  const titleSize = 0.105 * H;
  const scriptSize = 0.042 * H;
  const ribbonY = 0.815 * H;
  const ribbonH = 0.032 * H;
  const starsCy = 0.872 * H;
  const starR = 0.018 * H;
  const billingY = 0.93 * H;
  return {
    frameInset, bandH, titleTop, titleSize, scriptSize,
    scriptBaseline: titleTop + titleSize * 1.14,
    ribbonY, ribbonH,
    starsCy, starR,
    starsBottom: starsCy + starR,
    billingY, billingBottom: 0.958 * H,
    sealR: Math.round(0.052 * H),
    sealCx: W - frameInset - Math.round(0.052 * H) - 8,
    sealCy: 0.85 * H,
    wantedW: 0.15 * W,
    wantedH: 0.04 * H,
  };
}

// The 5 stars must sit fully inside the frame with >= 36px clear space
// below them (scaled to poster width) in every size.
export function starsInFrame(W, H) {
  const geo = titleGeometry(W, H);
  const bottomEdge = H - geo.frameInset;
  const clearance = bottomEdge - geo.starsBottom;
  const required = 36 * (W / 1920);
  return { ok: clearance >= required, clearancePx: Math.round(clearance), requiredPx: Math.round(required), starsBottom: Math.round(geo.starsBottom) };
}

export function titleClearsFace(layoutId, W, H) {
  const geo = titleGeometry(W, H);
  const face = heroFaceBox(layoutId, W, H);
  return { ok: face.y + face.h < geo.titleTop - 0.01 * H, faceBottom: Math.round(face.y + face.h), titleTop: Math.round(geo.titleTop) };
}

// All five furniture pieces, as rects — every one fully inside the poster.
export function furnitureGeometry(W, H) {
  const geo = titleGeometry(W, H);
  const fi = geo.frameInset;
  return {
    band: { x: fi, y: fi, w: W - 2 * fi, h: geo.bandH },
    vol: { x: W - fi - 0.115 * W, y: fi + geo.bandH * 0.18, w: 0.1 * W, h: geo.bandH * 0.64 },
    seal: { x: geo.sealCx - geo.sealR, y: geo.sealCy - geo.sealR, w: geo.sealR * 2, h: geo.sealR * 2 },
    ribbon: { x: W * 0.19, y: geo.ribbonY, w: W * 0.62, h: geo.ribbonH },
    billing: { x: fi + 8, y: geo.billingY, w: W * 0.62, h: 0.028 * H },
    barcode: { x: W - fi - 0.115 * W, y: geo.billingY - 0.004 * H, w: 0.1 * W, h: 0.032 * H },
    wanted: { x: fi + 6, y: geo.starsCy - geo.wantedH / 2, w: geo.wantedW, h: geo.wantedH },
    stars: { x: W / 2 - 0.15 * W, y: geo.starsCy - geo.starR, w: 0.3 * W, h: geo.starR * 2 },
  };
}

// Face-aware crop: the source rect that puts the face at ~30% down the
// panel (upper third) and centred horizontally, never cropping through it.
export function faceAwareCrop(imgW, imgH, panelW, panelH, face, zoom = 1, panX = 0, panY = 0) {
  const scale = Math.max(panelW / imgW, panelH / imgH) * Math.max(1, zoom);
  const sw = panelW / scale;
  const sh = panelH / scale;
  let sx = face.fx * imgW - sw * (0.5 + panX * 0.22);
  let sy = face.fy * imgH - sh * (0.3 + panY * 0.22);
  sx = Math.min(Math.max(sx, 0), Math.max(0, imgW - sw));
  sy = Math.min(Math.max(sy, 0), Math.max(0, imgH - sh));
  return { sx, sy, sw, sh };
}

// Deterministic barcode bars from a seed string (same seed → same bars).
export function barcodeBars(seed, count = 42) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const bars = [];
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    const r = (h >>> 0) / 4294967296;
    bars.push({ black: r > 0.42, w: r < 0.6 ? 1 : r < 0.85 ? 2 : 3 });
  }
  return bars;
}

// Map layout panels to photos (cycle the samples), applying overrides.
export function resolvePanels(state) {
  const layout = layoutById(state.layoutId);
  return layout.panels.map((p, i) => {
    const o = state.overrides[p.id] || {};
    const photo = state.photos[o.photo ?? (i % state.photos.length)];
    return {
      panel: p,
      photo,
      role: o.role ?? photo.role,
      location: o.location ?? photo.location,
      zoom: o.zoom ?? 1,
      panX: o.panX ?? 0,
      panY: o.panY ?? 0,
      flip: !!o.flip,
    };
  });
}

// ---- drawing helpers (browser) -------------------------------------------

function starPath(ctx, cx, cy, rO, rI, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rO : rI;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawStar(ctx, cx, cy, r, fill) {
  starPath(ctx, cx, cy, r, r * 0.45);
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panelPath(ctx, r, W) {
  const slant = r.slant ? 0.03 * W : 0;
  ctx.beginPath();
  ctx.moveTo(r.px + slant, r.py);
  ctx.lineTo(r.px + r.pw, r.py);
  ctx.lineTo(r.px + r.pw - slant, r.py + r.ph);
  ctx.lineTo(r.px, r.py + r.ph);
  ctx.closePath();
}

function gradeOverlay(ctx, rect, grade, posterInk) {
  const g = ctx.createLinearGradient(rect.px, rect.py, rect.px, rect.py + rect.ph);
  g.addColorStop(0, rgba(grade.top));
  g.addColorStop(1, rgba(grade.bottom));
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = g;
  ctx.fillRect(rect.px, rect.py, rect.pw, rect.ph);
  if (posterInk) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255,180,90,0.22)';
    ctx.fillRect(rect.px, rect.py, rect.pw, rect.ph);
  }
  ctx.restore();
}

function vignette(ctx, rect, strength) {
  if (strength <= 0) return;
  const cx = rect.px + rect.pw / 2;
  const cy = rect.py + rect.ph / 2;
  const r = Math.max(rect.pw, rect.ph) * 0.72;
  const g = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  g.addColorStop(0, 'rgba(30,0,40,0)');
  g.addColorStop(1, `rgba(30,0,40,${0.42 * strength})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(rect.px, rect.py, rect.pw, rect.ph);
  ctx.restore();
}

let noiseCanvas = null;
function grainTile() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 128;
  noiseCanvas.height = 128;
  const nctx = noiseCanvas.getContext('2d');
  const img = nctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 28;
  }
  nctx.putImageData(img, 0, 0);
  return noiseCanvas;
}

// Chrome-striped retro title on its own offscreen canvas, with a dark
// outline and a 3D extrude shadow baked in at draw time.
function drawChromeTitle(ctx, text, W, H, geo) {
  let size = geo.titleSize;
  const measure = document.createElement('canvas').getContext('2d');
  const setFont = (s) => { measure.font = `${s}px Anton, 'Arial Black', sans-serif`; };
  setFont(size);
  while (measure.measureText(text).width > 0.94 * W && size > 24) {
    size *= 0.96;
    setFont(size);
  }
  const tw = measure.measureText(text).width;
  const th = size * 1.28;
  const off = document.createElement('canvas');
  off.width = Math.ceil(tw + size * 0.3);
  off.height = Math.ceil(th);
  const o = off.getContext('2d');
  o.font = `${size}px Anton, 'Arial Black', sans-serif`;
  o.textBaseline = 'alphabetic';
  const ox = size * 0.15;
  const oy = size * 0.98;
  // Dark outline first (paint-order stroke behind the fill).
  o.lineJoin = 'round';
  o.strokeStyle = '#160818';
  o.lineWidth = Math.max(3, size * 0.055);
  o.strokeText(text, ox, oy);
  // Vertical chrome gradient fill.
  const grad = o.createLinearGradient(0, oy - size, 0, oy + size * 0.1);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, '#ffe27a');
  grad.addColorStop(0.6, '#ff9a3d');
  grad.addColorStop(0.82, '#ff4d7e');
  grad.addColorStop(1, '#c62b8a');
  o.fillStyle = grad;
  o.fillText(text, ox, oy);
  // Thin horizontal chrome stripes over the fill only.
  o.globalCompositeOperation = 'source-atop';
  const step = Math.max(4, size / 9);
  for (let y = oy - size; y < oy + size * 0.12; y += step * 2) {
    o.fillStyle = 'rgba(255,255,255,0.28)';
    o.fillRect(0, y, off.width, step * 0.42);
    o.fillStyle = 'rgba(90,10,60,0.16)';
    o.fillRect(0, y + step, off.width, step * 0.42);
  }
  o.globalCompositeOperation = 'source-over';
  // 3D extrude: dark tinted copy offset down-right.
  const ext = document.createElement('canvas');
  ext.width = off.width;
  ext.height = off.height;
  const e = ext.getContext('2d');
  e.drawImage(off, 0, 0);
  e.globalCompositeOperation = 'source-in';
  e.fillStyle = '#2a0a2e';
  e.fillRect(0, 0, ext.width, ext.height);
  const dx = Math.round(0.006 * W);
  const dy = Math.round(0.009 * H);
  const tx = (W - tw) / 2 - size * 0.15;
  const ty = geo.titleTop;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(0.02 * H);
  ctx.shadowOffsetY = Math.round(0.008 * H);
  ctx.drawImage(ext, tx + dx, ty + dy);
  ctx.restore();
  ctx.drawImage(off, tx, ty);
  return { titleBottom: ty + th, titleWidth: tw };
}

function drawPanel(ctx, resolved, rect, grade, state, W, H) {
  const { photo, zoom, panX, panY, flip } = resolved;
  if (!photo || !photo.img) return;
  const img = photo.img;
  ctx.save();
  panelPath(ctx, rect, W);
  ctx.clip();
  ctx.filter = gradeFilter(grade, state.posterInk);
  const crop = faceAwareCrop(img.naturalWidth, img.naturalHeight, rect.pw, rect.ph, photo, zoom, panX, panY);
  if (flip) {
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, rect.px + rect.pw, rect.py, -rect.pw, rect.ph);
  } else {
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, rect.px, rect.py, rect.pw, rect.ph);
  }
  ctx.filter = 'none';
  gradeOverlay(ctx, rect, grade, state.posterInk);
  if (state.vignette) vignette(ctx, rect, grade.vignette);
  ctx.restore();
  // Inner border; hero gets a gold edge.
  ctx.save();
  panelPath(ctx, rect, W);
  ctx.strokeStyle = rect.hero ? 'rgba(232,182,76,0.95)' : 'rgba(10,4,18,0.6)';
  ctx.lineWidth = rect.hero ? 3 : 2;
  ctx.stroke();
  ctx.restore();
}

function drawRoleTag(ctx, rect, tag, H) {
  if (!tag) return;
  const pad = Math.max(6, 0.008 * H);
  const roleSize = Math.max(11, 0.0165 * H);
  const locSize = Math.max(9, 0.0115 * H);
  ctx.save();
  ctx.font = `${roleSize}px Anton, 'Arial Black', sans-serif`;
  const roleW = ctx.measureText(tag.role).width;
  ctx.font = `${locSize}px Arial, sans-serif`;
  const locW = ctx.measureText(tag.location).width;
  const tw = Math.max(roleW, locW) + pad * 2;
  const th = roleSize + locSize + pad * 2.2;
  const tx = rect.px + 8;
  const ty = rect.py + rect.ph - th - 8;
  ctx.fillStyle = 'rgba(8,3,14,0.88)';
  roundRect(ctx, tx, ty, tw, th, 4);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.font = `${roleSize}px Anton, 'Arial Black', sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(tag.role, tx + pad, ty + pad * 0.7);
  ctx.fillStyle = '#f5e9ff';
  ctx.font = `${locSize}px Arial, sans-serif`;
  ctx.fillText(tag.location, tx + pad, ty + pad * 0.7 + roleSize + pad * 0.4);
  ctx.restore();
}

function drawSeal(ctx, geo) {
  const { sealCx, sealCy, sealR } = geo;
  ctx.save();
  ctx.translate(sealCx, sealCy);
  // 16-point starburst.
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const r = i % 2 === 0 ? sealR : sealR * 0.82;
    const a = (i * Math.PI) / 16 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#f0b93c';
  ctx.fill();
  ctx.strokeStyle = '#8a6420';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, sealR * 0.68, 0, Math.PI * 2);
  ctx.fillStyle = '#7d2a4d';
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(9, sealR * 0.24)}px Anton, 'Arial Black', sans-serif`;
  ctx.fillText('ORIGINAL', 0, -sealR * 0.2);
  ctx.fillText('COVER ART', 0, sealR * 0.16);
  ctx.font = `${Math.max(8, sealR * 0.16)}px Arial, sans-serif`;
  ctx.fillText('★ ★ ★', 0, sealR * 0.44);
  ctx.restore();
}

// ---- main entry ------------------------------------------------------------

export function renderPoster(canvas, state, W, H) {
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
  const grade = gradeById(state.gradeId);
  const frame = frameById(state.frameId);
  const geo = titleGeometry(W, H);
  const fi = geo.frameInset;
  const layout = layoutById(state.layoutId);
  const rects = layoutPixelRects(state.layoutId, W, H);
  const resolved = resolvePanels(state);
  const byId = {};
  resolved.forEach((r) => { byId[r.panel.id] = r; });

  // 1. Frame background.
  ctx.fillStyle = frame.bg;
  ctx.fillRect(0, 0, W, H);

  // 2. Full-bleed golden-hour backdrop (hero photo) behind everything.
  const heroPhoto = resolved.find((r) => r.panel.hero)?.photo || resolved[0]?.photo;
  if (heroPhoto?.img) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(fi, fi, W - 2 * fi, H - 2 * fi);
    ctx.clip();
    ctx.filter = gradeFilter(grade, state.posterInk);
    const img = heroPhoto.img;
    const scale = Math.max((W - 2 * fi) / img.naturalWidth, (H - 2 * fi) / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, fi + (W - 2 * fi - dw) / 2, fi + (H - 2 * fi - dh) / 2, dw, dh);
    ctx.filter = 'none';
    gradeOverlay(ctx, { px: fi, py: fi, pw: W - 2 * fi, ph: H - 2 * fi }, grade, state.posterInk);
    // Dark gradient so the title zone stays readable.
    const dg = ctx.createLinearGradient(0, H * 0.45, 0, H);
    dg.addColorStop(0, 'rgba(18,4,26,0)');
    dg.addColorStop(0.55, 'rgba(18,4,26,0.5)');
    dg.addColorStop(1, 'rgba(18,4,26,0.78)');
    ctx.fillStyle = dg;
    ctx.fillRect(fi, fi, W - 2 * fi, H - 2 * fi);
    ctx.restore();
  }

  // 3. Panels (non-hero first; the pop-out hero goes last, over the frame).
  for (const r of rects) {
    if (r.popout) continue;
    drawPanel(ctx, byId[r.id], r, grade, state, W, H);
  }

  // 4. Outer frame border.
  ctx.save();
  ctx.strokeStyle = frame.border;
  ctx.lineWidth = Math.max(4, fi * 0.5);
  ctx.strokeRect(fi / 2, fi / 2, W - fi, H - fi);
  ctx.strokeStyle = frame.border2;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(fi + 2, fi + 2, W - 2 * fi - 4, H - 2 * fi - 4);
  ctx.restore();

  // 5. TRUE pop-out hero: breaks the grid left + bottom, drop shadow.
  for (const r of rects) {
    if (!r.popout) continue;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = Math.round(0.022 * H);
    ctx.shadowOffsetX = Math.round(0.006 * W);
    ctx.shadowOffsetY = Math.round(0.01 * H);
    panelPath(ctx, r, W);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
    drawPanel(ctx, byId[r.id], r, grade, state, W, H);
  }

  // 6. Role tags + small-print story details on the panels.
  for (const r of rects) {
    drawRoleTag(ctx, r, byId[r.id], H);
  }
  const heroRect = rects.find((r) => r.hero);
  if (heroRect && heroRect.ph > 140) {
    ctx.save();
    ctx.font = `${Math.max(10, 0.013 * H)}px Anton, 'Arial Black', sans-serif`;
    ctx.fillStyle = 'rgba(8,3,14,0.85)';
    const sign = 'OCEAN DR';
    const sw = ctx.measureText(sign).width + 16;
    roundRect(ctx, heroRect.px + 10, heroRect.py + 10, sw, Math.max(18, 0.024 * H), 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(sign, heroRect.px + 18, heroRect.py + 10 + Math.max(18, 0.024 * H) / 2);
    ctx.restore();
  }
  const lastRect = rects[rects.length - 1];
  if (lastRect && lastRect.ph > 120) {
    ctx.save();
    ctx.font = `${Math.max(9, 0.012 * H)}px Anton, 'Arial Black', sans-serif`;
    const plate = 'LEONIDA';
    const pw = ctx.measureText(plate).width + 14;
    ctx.fillStyle = '#f5e9c8';
    roundRect(ctx, lastRect.px + lastRect.pw - pw - 8, lastRect.py + lastRect.ph - 30, pw, 22, 3);
    ctx.fill();
    ctx.fillStyle = '#1a2a6b';
    ctx.textBaseline = 'middle';
    ctx.fillText(plate, lastRect.px + lastRect.pw - pw - 1, lastRect.py + lastRect.ph - 19);
    ctx.restore();
  }

  // 7. Press-quote band + VOL. pill.
  ctx.save();
  ctx.fillStyle = 'rgba(8,3,14,0.96)';
  ctx.fillRect(fi, fi, W - 2 * fi, geo.bandH);
  const starY = fi + geo.bandH / 2;
  let sx = fi + 16;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, sx, starY, geo.bandH * 0.22, '#f0b93c');
    sx += geo.bandH * 0.52;
  }
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `${Math.max(11, 0.02 * H)}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`"${state.quote}"  —  ${state.paper}`, W / 2 + 0.02 * W, starY);
  ctx.textAlign = 'left';
  // VOL. pill, top-right inside the band.
  const volW = 0.1 * W;
  const volH = geo.bandH * 0.64;
  const volX = W - fi - volW - 10;
  const volY = fi + geo.bandH * 0.18;
  ctx.fillStyle = '#ffd94d';
  roundRect(ctx, volX, volY, volW, volH, volH / 2);
  ctx.fill();
  ctx.fillStyle = '#1a0a24';
  ctx.font = `${Math.max(10, 0.017 * H)}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(state.volume, volX + volW / 2, volY + volH / 2);
  ctx.restore();

  // 8. Chrome title + neon script.
  const { titleBottom } = drawChromeTitle(ctx, state.title, W, H, geo);
  ctx.save();
  ctx.font = `${geo.scriptSize}px Pacifico, cursive`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = '#ff2e9a';
  ctx.shadowBlur = Math.round(0.016 * H);
  ctx.fillStyle = '#ff8fd4';
  ctx.fillText(state.subtitle, W - fi - 0.02 * W, geo.scriptBaseline);
  ctx.restore();

  // 9. Tagline ribbon.
  ctx.save();
  const rib = { x: W * 0.19, y: geo.ribbonY, w: W * 0.62, h: geo.ribbonH };
  ctx.beginPath();
  ctx.moveTo(rib.x + rib.h * 0.6, rib.y);
  ctx.lineTo(rib.x + rib.w - rib.h * 0.6, rib.y);
  ctx.lineTo(rib.x + rib.w, rib.y + rib.h);
  ctx.lineTo(rib.x, rib.y + rib.h);
  ctx.closePath();
  ctx.fillStyle = '#2a0a2e';
  ctx.fill();
  ctx.strokeStyle = '#e8b64c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ffd76a';
  ctx.font = `${Math.max(10, 0.016 * H)}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.tagline, W / 2, rib.y + rib.h / 2);
  ctx.restore();

  // 10. WANTED badge + 5-star heat meter.
  ctx.save();
  const wGeo = { x: fi + 6, y: geo.starsCy - geo.wantedH / 2, w: geo.wantedW, h: geo.wantedH };
  ctx.fillStyle = '#b01e2e';
  roundRect(ctx, wGeo.x, wGeo.y, wGeo.w, wGeo.h, 4);
  ctx.fill();
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 1.5;
  roundRect(ctx, wGeo.x, wGeo.y, wGeo.w, wGeo.h, 4);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.max(9, 0.015 * H)}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ WANTED ★', wGeo.x + wGeo.w / 2, wGeo.y + wGeo.h / 2);
  const starGap = 0.062 * W;
  const starsW = starGap * 4;
  let starX = W / 2 - starsW / 2;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, starX, geo.starsCy, geo.starR, '#f0b93c');
    ctx.strokeStyle = '#8a6420';
    ctx.lineWidth = 1;
    starPath(ctx, starX, geo.starsCy, geo.starR, geo.starR * 0.45);
    ctx.stroke();
    starX += starGap;
  }
  ctx.restore();

  // 11. Gold seal (bottom-right).
  drawSeal(ctx, geo);

  // 12. Billing block + barcode along the very bottom.
  ctx.save();
  ctx.fillStyle = frame.billing;
  ctx.font = `${Math.max(9, 0.0115 * H)}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('A LEONIDA NIGHTS PICTURE  ·  STARRING THE DRIVER · THE BOSS · THE RIDER · THE FIXER · THE INSIDER', fi + 8, geo.billingY);
  ctx.fillText('SHOT ON YOUR OWN CAMERA  ·  GRADED BY HAND  ·  LEONIDA NIGHTS © 2026', fi + 8, geo.billingY + 0.017 * H);
  const bars = barcodeBars(state.title + state.volume);
  const barX0 = W - fi - 0.115 * W;
  const barY = geo.billingY - 0.004 * H;
  const barH = 0.032 * H;
  let bx = barX0;
  const unit = Math.max(1, Math.round(0.0016 * W));
  for (const b of bars) {
    if (b.black) {
      ctx.fillStyle = frame.id === 'cream' ? '#241536' : '#f5e9c8';
      ctx.fillRect(bx, barY, b.w * unit, barH);
    }
    bx += (b.w + 1) * unit;
  }
  ctx.restore();

  // 13. Grain + whole-poster vignette.
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
    ctx.fillRect(fi, fi, W - 2 * fi, H - 2 * fi);
    ctx.restore();
  }
  if (state.vignette) {
    vignette(ctx, { px: 0, py: 0, pw: W, ph: H }, 0.35);
  }
  return { titleBottom };
}
