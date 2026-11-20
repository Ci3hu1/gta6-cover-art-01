// shots.js — screenshot scenes driven by ?shot= query params.
// The screenshots are the app's own drawing at the requested size, never
// edited or composited afterwards:
//   ?shot=cover&caption=LEONIDA%20NIGHTS   full-bleed cover at viewport size
//   ?shot=editor                            the studio UI with photos loaded
//   ?shot=layouts&caption=NEON%20DRIVE     2 x 2 overview of four layouts
// The cover scene renders at the viewport's own aspect ratio, so a 1280x720
// viewport gives the 16:9 cover and a 1024x1280 viewport the 4:5 portrait.

import { renderCover, defaultState } from './cover.js';
import { LAYOUTS } from './layouts.js';

export function parseShotParams(search) {
  const q = new URLSearchParams(search);
  const shot = q.get('shot');
  if (!shot) return null;
  return {
    mode: shot,
    title: (q.get('caption') || 'LEONIDA NIGHTS').toUpperCase(),
    subtitle: q.get('subtitle') || 'Vice City Nights',
    layout: q.get('layout') || 'hero-led',
    grade: q.get('grade') || 'vice-sunset',
  };
}

export function stateFromParams(params, overrides = {}) {
  const state = defaultState();
  state.title = params.title;
  state.subtitle = params.subtitle;
  state.layout = params.layout;
  state.grade = params.grade;
  Object.assign(state, overrides);
  return state;
}

// Full-bleed cover scene (modes: cover, portrait).
export function drawCoverShot(ctx, W, H, params, images) {
  renderCover(ctx, W, H, stateFromParams(params), images);
}

// Layout overview: four layouts in a 2 x 2 grid with name labels.
export function drawLayoutsShot(ctx, W, H, params, images) {
  ctx.fillStyle = '#160b26';
  ctx.fillRect(0, 0, W, H);
  const ids = ['hero-led', 'grid', 'portrait', 'wide'];
  const gap = 12, labelH = 34;
  const cw = (W - gap * 3) / 2, ch = (H - gap * 3 - labelH * 2) / 2;
  ids.forEach((id, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gap + col * (cw + gap), y = gap + row * (ch + labelH + gap);
    const off = document.createElement('canvas');
    off.width = Math.round(cw); off.height = Math.round(ch);
    renderCover(off.getContext('2d'), off.width, off.height,
      stateFromParams(params, { layout: id, grade: 'neon-night' }), images);
    ctx.drawImage(off, x, y, cw, ch);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = `700 ${Math.round(labelH * 0.5)}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText((LAYOUTS.find((l) => l.id === id) || {}).name || id, x + 4, y + ch + labelH / 2);
  });
}
