// Fixed scenes for screenshots: ?shot=cover shows the exported cover
// alone, ?shot=editor shows the editor with photos loaded, ?shot=portrait
// the portrait cover, ?shot=layouts an overview of all four layouts.
// window.__shotReady is set once painted (Playwright waits for it).

import { renderCover } from './cover.js';
import { gradeById } from './grades.js';

const FIVE_PHOTOS = [
  { photo: 'boulevard', zoom: 1, ox: 0.5, oy: 0.45 },
  { photo: 'pier', zoom: 1, ox: 0.5, oy: 0.45 },
  { photo: 'car', zoom: 1, ox: 0.5, oy: 0.45 },
  { photo: 'skyline', zoom: 1, ox: 0.5, oy: 0.7 },
  { photo: 'neon', zoom: 1, ox: 0.5, oy: 0.5 },
];

function waitForApp() {
  return new Promise((resolve) => {
    const tick = () => {
      if (window.__coverApp) resolve(window.__coverApp);
      else setTimeout(tick, 50);
    };
    tick();
  });
}

async function waitFonts() {
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
  } catch { /* fall back to system fonts */ }
}

function shotCanvas(w, h) {
  document.body.classList.add('shot-cover');
  let canvas = document.getElementById('shotCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'shotCanvas';
    document.body.appendChild(canvas);
  }
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

async function renderStandalone(app, { layout, gradeId, title, subtitle, photos, w, h }) {
  const grade = gradeById(gradeId);
  const panels = [];
  for (const p of photos) {
    const img = await app.ensureImage(p.photo);
    const { processPhoto } = await import('./cover.js');
    const inked = processPhoto(img, grade, { inkWidth: 2, seed: 7 });
    panels.push({ photo: p.photo, zoom: p.zoom ?? 1, ox: p.ox ?? 0.5, oy: p.oy ?? 0.5, inked });
  }
  const canvas = shotCanvas(w, h);
  const ctx = canvas.getContext('2d');
  renderCover(ctx, w, h, { layout, grade, title, subtitle, grain: true, vignette: true, panels });
}

async function renderLayouts(app) {
  const W = 1280;
  const H = 720;
  const canvas = shotCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, W, H);
  const layouts = [
    ['classic', 'Classic Grid'],
    ['hero', 'Hero-led'],
    ['portrait', 'Portrait'],
    ['wide', 'Wide'],
  ];
  const cellW = 600;
  const cellH = 300;
  const gapX = 24;
  const gapY = 44;
  const x0 = (W - (cellW * 2 + gapX)) / 2;
  const y0 = 28;
  const grade = gradeById('neon');
  for (let i = 0; i < layouts.length; i++) {
    const [layoutId, label] = layouts[i];
    const cx = x0 + (i % 2) * (cellW + gapX);
    const cy = y0 + Math.floor(i / 2) * (cellH + gapY);
    const panels = [];
    for (const p of FIVE_PHOTOS) {
      const img = await app.ensureImage(p.photo);
      const { processPhoto } = await import('./cover.js');
      panels.push({ photo: p.photo, zoom: p.zoom ?? 1, ox: p.ox ?? 0.5, oy: p.oy ?? 0.5, inked: processPhoto(img, grade, { inkWidth: 2, seed: 7 }) });
    }
    const mini = document.createElement('canvas');
    mini.width = cellW;
    mini.height = cellH;
    renderCover(mini.getContext('2d'), cellW, cellH, {
      layout: layoutId, grade, title: 'NEON DRIVE',
      subtitle: 'a night drive in Leonida', grain: true, vignette: true, panels,
    });
    ctx.fillStyle = '#f5f0dc';
    ctx.font = 'bold 20px Anton, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, cx, cy - 10);
    ctx.drawImage(mini, cx, cy, cellW, cellH);
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, cellW, cellH);
  }
}

export async function runShot() {
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot') || 'editor';
  const caption = query.get('caption') || 'PALM HEAT';
  const app = await waitForApp();
  await waitFonts();

  if (shot === 'cover') {
    await app.setState({
      layout: 'hero', grade: 'vice', title: caption,
      subtitle: 'a sunset story in Leonida',
      panels: FIVE_PHOTOS.map((p) => ({ ...p })),
    });
    await renderStandalone(app, {
      layout: 'hero', gradeId: 'vice', title: caption,
      subtitle: 'a sunset story in Leonida', photos: FIVE_PHOTOS,
      w: window.innerWidth, h: window.innerHeight,
    });
  } else if (shot === 'portrait') {
    await renderStandalone(app, {
      layout: 'portrait', gradeId: 'vice', title: caption,
      subtitle: 'a sunset story in Leonida', photos: FIVE_PHOTOS,
      w: window.innerWidth, h: window.innerHeight,
    });
  } else if (shot === 'layouts') {
    await renderLayouts(app);
  } else {
    // Editor: default preset, photos loaded, UI visible.
    await app.setState({
      layout: 'hero', grade: 'vice', title: caption,
      subtitle: 'a sunset story in Leonida',
      panels: FIVE_PHOTOS.map((p) => ({ ...p })),
    });
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
}

if (new URLSearchParams(location.search).has('shot')) {
  runShot();
}
