// shots.js — the ?shot= scene driver for screenshots.
// The app renders each screenshot scene itself (the house kit's render.mjs
// pattern): ?shot=cover draws the exported cover full-frame, ?shot=editor
// shows the editor with a photo loaded, ?shot=portrait draws the tall
// cover, ?shot=layouts draws a four-layout overview. When a scene is done
// it sets window.__shotReady = true so the screenshot script knows the
// ink pipeline has finished drawing.

import { gradeById } from './grades.js';
import { LAYOUT_IDS, LAYOUT_NAMES } from './layouts.js';
import { SAMPLE_PHOTOS, DEFAULT_COVER, renderCover } from './cover.js';
import { Editor, EXPORT_SIZES, sizeById, loadImage, buildControls } from './main.js';

function stateFromParams(params) {
  return {
    layout: params.get('layout') || DEFAULT_COVER.layout,
    grade: params.get('grade') || DEFAULT_COVER.grade,
    caption: params.get('caption') || DEFAULT_COVER.caption,
    subtitle: params.get('subtitle') || DEFAULT_COVER.subtitle,
    photos: (params.get('photos') || DEFAULT_COVER.photos.join(',')).split(','),
    size: params.get('size') || '1920x1080',
    inkWidth: Number(params.get('ink') || 2),
    grain: Number(params.get('grain') || 8),
  };
}

async function loadAllPhotos() {
  const photos = new Map();
  await document.fonts.load('16px Anton');
  await document.fonts.load('16px Pacifico');
  for (const p of SAMPLE_PHOTOS) {
    photos.set(p.id, await loadImage(p.src));
  }
  return photos;
}

function fullScreenCanvas() {
  document.body.innerHTML = '';
  document.body.style.margin = '0';
  document.body.style.background = '#f5efe2';
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  document.body.appendChild(canvas);
  return canvas;
}

function markReady() {
  window.__shotReady = true;
  document.title = `shot ready — ${new URLSearchParams(location.search).get('shot')}`;
}

async function shotCover(params) {
  const photos = await loadAllPhotos();
  const state = stateFromParams(params);
  const canvas = fullScreenCanvas();
  renderCover(canvas, photos, state, { w: canvas.width, h: canvas.height });
  markReady();
}

async function shotEditor(params) {
  // Normal editor page, prefilled from the query, photo already loaded.
  const canvas = document.getElementById('coverCanvas');
  const editor = new Editor(canvas);
  buildControls(editor);
  await editor.init();
  const state = stateFromParams(params);
  editor.set({
    layout: state.layout,
    grade: state.grade,
    caption: state.caption,
    subtitle: state.subtitle,
    photos: state.photos,
  });
  // Let the preview paint, then signal ready.
  requestAnimationFrame(() => requestAnimationFrame(markReady));
}

async function shotLayouts(params) {
  const photos = await loadAllPhotos();
  const state = stateFromParams(params);
  const canvas = fullScreenCanvas();
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#f5efe2';
  ctx.fillRect(0, 0, W, H);
  const show = ['hero', 'classic', 'portrait', 'wide'];
  const cw = (W - 48) / 2;
  const ch = (H - 96) / 2;
  for (let i = 0; i < show.length; i++) {
    const layout = show[i];
    const x = 16 + (i % 2) * (cw + 16);
    const y = 16 + Math.floor(i / 2) * (ch + 48);
    const off = document.createElement('canvas');
    // Portrait layout keeps its tall aspect inside its cell.
    const aspect = layout === 'portrait' ? 1080 / 1350 : 1920 / 1080;
    let ow = cw;
    let oh = cw / aspect;
    if (oh > ch) {
      oh = ch;
      ow = ch * aspect;
    }
    off.width = Math.round(ow);
    off.height = Math.round(oh);
    const sub = { ...state, layout };
    renderCover(off, photos, sub, { w: off.width, h: off.height });
    ctx.drawImage(off, x + (cw - ow) / 2, y, ow, oh);
    ctx.fillStyle = '#160a24';
    ctx.font = `${Math.round(H * 0.028)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(LAYOUT_NAMES[layout].toUpperCase(), x + cw / 2, y + oh + Math.round(H * 0.04));
  }
  markReady();
}

export async function runShot(params) {
  const shot = params.get('shot');
  try {
    if (shot === 'editor') await shotEditor(params);
    else if (shot === 'layouts') await shotLayouts(params);
    else await shotCover(params); // 'cover' and 'portrait' both render a cover
  } catch (err) {
    document.title = `shot failed: ${err.message}`;
    window.__shotError = String(err && err.message ? err.message : err);
    throw err;
  }
}

// Re-exported for the editor's size picker (kept in one place).
export { EXPORT_SIZES, sizeById, gradeById, LAYOUT_IDS };
