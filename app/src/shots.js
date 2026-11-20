// Leonida Nights Cover Studio v4 — screenshot scenes.
// ?shot=cover     full-bleed exported cover, Pop-Out Cast, 5 people photos
// ?shot=editor    the normal studio (default, no query)
// ?shot=portrait  portrait layout cover, 1024 x 1280
// ?shot=layouts   overview of all 8 layouts, caption "NEON DRIVE"
// Returns true when a shot scene took over (boot then skips the studio).

import { LAYOUTS } from './layouts.js';
import { renderPoster } from './cover.js';

function setShotClass(cls) {
  document.body.classList.add('shot', cls);
  document.querySelector('header').style.display = 'none';
  document.querySelector('.controls').style.display = 'none';
  document.querySelector('main').classList.add('shot-main');
}

export function handleShotMode(state, preview, exportPNG) {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot || shot === 'editor') return false;

  if (shot === 'cover') {
    setShotClass('shot-cover');
    state.title = 'LEONIDA NIGHTS';
    state.subtitle = 'Vice City Nights';
    state.layoutId = 'popout';
    state.gradeId = 'golden-hour';
    state.frameId = 'gold';
    renderPoster(preview, state, 1280, 720);
    return true;
  }

  if (shot === 'portrait') {
    setShotClass('shot-portrait');
    state.title = 'LEONIDA NIGHTS';
    state.subtitle = 'Vice City Nights';
    state.layoutId = 'portrait';
    state.gradeId = 'golden-hour';
    state.frameId = 'gold';
    renderPoster(preview, state, 1024, 1280);
    return true;
  }

  if (shot === 'layouts') {
    setShotClass('shot-layouts');
    document.querySelector('.preview-wrap').style.display = 'none';
    const overview = document.getElementById('layouts-overview');
    overview.hidden = false;
    const head = document.createElement('h2');
    head.textContent = 'NEON DRIVE — all 8 layouts';
    overview.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'layouts-grid';
    overview.appendChild(grid);
    for (const layout of LAYOUTS) {
      const fig = document.createElement('figure');
      const canvas = document.createElement('canvas');
      const shotState = { ...state, title: 'NEON DRIVE', layoutId: layout.id, overrides: {} };
      renderPoster(canvas, shotState, 960, 540);
      canvas.style.width = '100%';
      const cap = document.createElement('figcaption');
      cap.textContent = layout.name;
      fig.appendChild(canvas);
      fig.appendChild(cap);
      grid.appendChild(fig);
    }
    return true;
  }

  return false;
}
