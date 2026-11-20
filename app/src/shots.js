// shots.js — screenshot scenes for Palm Heat Cover Studio.
// Driven by the URL query so the screenshots are the app itself drawing:
//   ?shot=cover&layout=hero&grade=vice-sunset&caption=PALM%20HEAT
//       full-frame exported cover at the viewport size.
//   ?shot=editor — the editor with a photo loaded.
//   ?shot=portrait — portrait cover, full frame.
//   ?shot=layouts&caption=NEON%20DRIVE — all four layouts side by side.
// Sets window.__shotReady = true once the scene has fully drawn.

import { LAYOUTS } from './layouts.js';
import { loadSampleImages, renderCover } from './cover.js';
import { loadFonts, defaultState, initEditor } from './main.js';

const params = new URLSearchParams(location.search);

async function shotCover() {
  document.body.classList.add('shot-mode');
  const layout = params.get('layout') || 'hero';
  const grade = params.get('grade') || 'vice-sunset';
  const caption = params.get('caption') || 'PALM HEAT';
  const subtitle = params.get('subtitle') || 'Vice City Nights';
  const W = window.innerWidth;
  const H = window.innerHeight;
  const canvas = document.getElementById('shotCanvas');
  canvas.width = W;
  canvas.height = H;
  canvas.style.display = 'block';
  await loadFonts();
  const layoutDef = LAYOUTS[layout] || LAYOUTS.hero;
  const photos = layoutDef.panels.map((p) => p.photo);
  const images = await loadSampleImages([...new Set(photos)]);
  await renderCover(canvas.getContext('2d'), W, H, {
    layout,
    grade,
    caption,
    subtitle,
    images,
    panelPhotos: photos,
    panelFocus: layoutDef.panels.map((p) => ({ fx: p.fx, fy: p.fy, zoom: p.zoom })),
  });
  window.__shotReady = true;
}

async function shotLayouts() {
  document.body.classList.add('shot-mode');
  const caption = params.get('caption') || 'NEON DRIVE';
  const grade = params.get('grade') || 'neon-night';
  const ids = ['hero', 'classic', 'portrait', 'wide'];
  const allPhotos = new Set();
  ids.forEach((id) => LAYOUTS[id].panels.forEach((p) => allPhotos.add(p.photo)));
  await loadFonts();
  const images = await loadSampleImages([...allPhotos]);
  const grid = document.getElementById('layoutsGrid');
  grid.style.display = 'grid';
  for (const id of ids) {
    const layoutDef = LAYOUTS[id];
    const cell = document.createElement('div');
    cell.className = 'layout-cell';
    const canvas = document.createElement('canvas');
    // 2x2 grid: each mini cover drawn at 620px wide so the title block,
    // badge and story details stay legible; the page is 1280x1080 so the
    // whole overview fits the frame.
    const cw = 620;
    const ch = 470;
    canvas.width = cw;
    canvas.height = ch;
    cell.appendChild(canvas);
    const label = document.createElement('div');
    label.className = 'layout-label';
    label.textContent = layoutDef.name;
    cell.appendChild(label);
    grid.appendChild(cell);
    await renderCover(canvas.getContext('2d'), cw, ch, {
      layout: id,
      grade,
      caption,
      subtitle: 'Vice City Nights',
      images,
      panelPhotos: layoutDef.panels.map((p) => p.photo),
      panelFocus: layoutDef.panels.map((p) => ({ fx: p.fx, fy: p.fy, zoom: p.zoom })),
    });
  }
  window.__shotReady = true;
}

async function boot() {
  const shot = params.get('shot');
  if (shot === 'cover' || shot === 'portrait') {
    await shotCover();
  } else if (shot === 'layouts') {
    await shotLayouts();
  } else {
    // Default: the editor.
    const state = defaultState();
    void state;
    await initEditor();
    window.__shotReady = true;
  }
}

boot().catch((e) => {
  console.error(e);
  document.title = 'SHOT ERROR: ' + e.message;
});
