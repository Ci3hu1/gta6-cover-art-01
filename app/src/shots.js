// Palm Heat Cover Studio — shots.js
// Fixed scenes for screenshots, driven by ?shot= in the URL.
//   ?shot=cover&layout=wide&caption=PALM%20HEAT   — the exported cover alone
//   ?shot=editor&photo=boulevard&caption=...       — the editor with a photo
//   ?shot=layouts&caption=NEON%20DRIVE             — all four layouts at once
// window.__shotReady is set once the scene has painted.

import { defaultPanels, defaultState, sampleById } from './main.js';
import { layoutById } from './layouts.js';

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

function fitCanvas(canvas, w, h) {
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.display = 'block';
}

async function runCover(query, api) {
  const layoutId = query.get('layout') ?? 'wide';
  const caption = query.get('caption') ?? 'PALM HEAT';
  const layout = layoutById(layoutId);
  const canvas = document.getElementById('cover');
  const w = Math.min(window.innerWidth, 1280);
  const h = Math.round((w * layout.h) / layout.w);
  fitCanvas(canvas, w, h);
  const panels = defaultPanels();
  // The cover shot uses five DIFFERENT photos, one per panel.
  api.state = {
    ...defaultState(),
    caption,
    subtitle: 'Leonida • Vice City',
    grade: query.get('grade') ?? 'vice-sunset',
    layout: layoutId,
    panels,
  };
  await api.renderInto(canvas);
  ready();
}

async function runEditor(query, api) {
  const photo = query.get('photo') ?? 'boulevard';
  const caption = query.get('caption') ?? 'PALM HEAT';
  const s = sampleById(photo);
  api.state = {
    ...defaultState(),
    caption,
    panels: defaultPanels().map((p, i) =>
      i === 0 ? { photo, fx: s.fx, fy: s.fy, zoom: s.zoom ?? 1, lift: s.lift } : p),
  };
  // The editor chrome is built by main.js; here we only paint the cover.
  const canvas = document.getElementById('cover');
  canvas.width = 640;
  canvas.height = 640;
  await api.renderInto(canvas);
  ready();
}

async function runLayouts(query, api) {
  const caption = query.get('caption') ?? 'NEON DRIVE';
  const canvas = document.getElementById('cover');
  const W = window.innerWidth;
  const H = window.innerHeight;
  fitCanvas(canvas, W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#14101a';
  ctx.fillRect(0, 0, W, H);
  const ids = ['hero', 'classic', 'portrait', 'wide'];
  const labels = ['Hero-led', 'Classic Grid', 'Portrait', 'Wide'];
  const cellW = Math.floor((W - 60) / 2);
  const cellH = Math.floor((H - 90) / 2);
  for (let i = 0; i < 4; i++) {
    const cx = 20 + (i % 2) * (cellW + 20);
    const cy = 20 + Math.floor(i / 2) * (cellH + 25);
    const layout = layoutById(ids[i]);
    const scale = Math.min(cellW / layout.w, (cellH - 28) / layout.h);
    const cw = Math.round(layout.w * scale);
    const ch = Math.round(layout.h * scale);
    const off = document.createElement('canvas');
    off.width = cw;
    off.height = ch;
    api.state = {
      ...defaultState(),
      caption,
      subtitle: 'Leonida • Vice City',
      grade: i % 2 === 0 ? 'vice-sunset' : 'neon-night',
      layout: ids[i],
      panels: defaultPanels(),
    };
    await api.renderInto(off);
    ctx.drawImage(off, cx + (cellW - cw) / 2, cy, cw, ch);
    ctx.fillStyle = '#f5e6c8';
    ctx.font = '22px Anton, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], cx + cellW / 2, cy + ch + 24);
  }
  ready();
}

export async function runShot(shot, query, api) {
  if (shot === 'cover') return runCover(query, api);
  if (shot === 'layouts') return runLayouts(query, api);
  return runEditor(query, api);
}
