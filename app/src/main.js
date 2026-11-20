// main.js — the Palm Heat Cover Studio editor.
// Wires the controls to the cover renderer: caption, grade, layout,
// export size, per-panel photo + crop, undo/redo, PNG export.
// Fully offline: every asset is a file under app/.

import { GRADES, gradeById } from './grades.js';
import { LAYOUTS, SAMPLES, sampleFile } from './layouts.js';
import { renderCover, loadImage } from './cover.js';

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide 1920 × 1080' },
};

export function defaultState() {
  return {
    caption: 'PALM HEAT',
    subtitle: 'Vice City Nights',
    grade: 'vice-sunset',
    layout: 'hero',
    size: '1080x1080',
    panelPhotos: ['boulevard', 'skyline', 'crowd', 'car', 'pier'],
    panelFocus: [
      { fx: 0.5, fy: 0.3, zoom: 1.05 },
      { fx: 0.5, fy: 0.78, zoom: 1.7 },
      { fx: 0.5, fy: 0.4, zoom: 1.05 },
      { fx: 0.5, fy: 0.5, zoom: 1.05 },
      { fx: 0.5, fy: 0.35, zoom: 1.05 },
    ],
  };
}

const $ = (id) => document.getElementById(id);

let state = defaultState();
let images = new Map();
let history = [];
let future = [];
let rendering = false;
let queued = false;

function snapshot() {
  return JSON.stringify(state);
}

function pushHistory() {
  history.push(snapshot());
  if (history.length > 50) history.shift();
  future = [];
  updateUndoButtons();
}

function updateUndoButtons() {
  $('undoBtn').disabled = history.length === 0;
  $('redoBtn').disabled = future.length === 0;
}

export async function loadFonts() {
  const faces = [
    new FontFace('Anton', "url('fonts/Anton-Regular.ttf')"),
    new FontFace('Pacifico', "url('fonts/Pacifico-Regular.ttf')"),
  ];
  for (const f of faces) {
    try {
      await f.load();
      document.fonts.add(f);
    } catch (e) {
      console.warn('font failed', e);
    }
  }
  await document.fonts.ready;
}

async function ensureImages() {
  const needed = new Set(state.panelPhotos);
  for (const id of needed) {
    if (!images.has(id)) {
      images.set(id, await loadImage(sampleFile(id)));
    }
  }
}

async function render() {
  if (rendering) {
    queued = true;
    return;
  }
  rendering = true;
  try {
    await ensureImages();
    const canvas = $('preview');
    const size = SIZES[state.size];
    const scale = Math.min(1, 640 / Math.max(size.w, size.h));
    canvas.width = Math.round(size.w * scale);
    canvas.height = Math.round(size.h * scale);
    await renderCover(canvas.getContext('2d'), canvas.width, canvas.height, {
      layout: state.layout,
      grade: state.grade,
      caption: state.caption,
      subtitle: state.subtitle,
      images,
      panelPhotos: state.panelPhotos,
      panelFocus: state.panelFocus,
    });
    $('sizeLabel').textContent = `${SIZES[state.size].label} · ${gradeById(state.grade).name}`;
  } finally {
    rendering = false;
    if (queued) {
      queued = false;
      render();
    }
  }
}

function buildPanelControls() {
  const wrap = $('panels');
  wrap.innerHTML = '';
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  layout.panels.forEach((panel, i) => {
    const photo = state.panelPhotos[i] || panel.photo;
    const focus = state.panelFocus[i] || { fx: panel.fx, fy: panel.fy, zoom: panel.zoom };
    const div = document.createElement('div');
    div.className = 'panel-card';
    div.innerHTML = `
      <div class="panel-head">Panel ${i + 1} · ${photo}</div>
      <label>Photo
        <select data-panel="${i}" data-field="photo">
          ${SAMPLES.map((s) => `<option value="${s.id}" ${s.id === photo ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </label>
      <label>Focus X <input type="range" min="0" max="100" value="${Math.round(focus.fx * 100)}" data-panel="${i}" data-field="fx"></label>
      <label>Focus Y <input type="range" min="0" max="100" value="${Math.round(focus.fy * 100)}" data-panel="${i}" data-field="fy"></label>
      <label>Zoom <input type="range" min="100" max="180" value="${Math.round(focus.zoom * 100)}" data-panel="${i}" data-field="zoom"></label>`;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('select, input').forEach((el) => {
    el.addEventListener('change', () => {
      pushHistory();
      const i = Number(el.dataset.panel);
      const field = el.dataset.field;
      if (field === 'photo') state.panelPhotos[i] = el.value;
      else if (field === 'fx') state.panelFocus[i].fx = Number(el.value) / 100;
      else if (field === 'fy') state.panelFocus[i].fy = Number(el.value) / 100;
      else if (field === 'zoom') state.panelFocus[i].zoom = Number(el.value) / 100;
      buildPanelControls();
      render();
    });
  });
}

function syncLayoutPanels() {
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  state.panelPhotos = layout.panels.map((p) => p.photo);
  state.panelFocus = layout.panels.map((p) => ({ fx: p.fx, fy: p.fy, zoom: p.zoom }));
}

async function exportPng() {
  const size = SIZES[state.size];
  await ensureImages();
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  await renderCover(canvas.getContext('2d'), size.w, size.h, {
    layout: state.layout,
    grade: state.grade,
    caption: state.caption,
    subtitle: state.subtitle,
    images,
    panelPhotos: state.panelPhotos,
    panelFocus: state.panelFocus,
  });
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `palm-heat-${state.size}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export async function initEditor() {
  // Controls
  $('captionInput').value = state.caption;
  $('subtitleInput').value = state.subtitle;
  $('gradeSelect').innerHTML = GRADES.map((g) => `<option value="${g.id}">${g.name}</option>`).join('');
  $('gradeSelect').value = state.grade;
  $('layoutSelect').innerHTML = Object.values(LAYOUTS)
    .map((l) => `<option value="${l.id}">${l.name}</option>`)
    .join('');
  $('layoutSelect').value = state.layout;
  $('sizeSelect').innerHTML = Object.entries(SIZES)
    .map(([id, s]) => `<option value="${id}">${s.label}</option>`)
    .join('');
  $('sizeSelect').value = state.size;

  $('captionInput').addEventListener('input', (e) => {
    state.caption = e.target.value.toUpperCase() || 'PALM HEAT';
    render();
  });
  $('subtitleInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value || 'Vice City Nights';
    render();
  });
  $('gradeSelect').addEventListener('change', (e) => {
    pushHistory();
    state.grade = e.target.value;
    render();
  });
  $('layoutSelect').addEventListener('change', (e) => {
    pushHistory();
    state.layout = e.target.value;
    syncLayoutPanels();
    buildPanelControls();
    render();
  });
  $('sizeSelect').addEventListener('change', (e) => {
    pushHistory();
    state.size = e.target.value;
    render();
  });
  $('exportBtn').addEventListener('click', exportPng);
  $('undoBtn').addEventListener('click', () => {
    if (!history.length) return;
    future.push(snapshot());
    state = JSON.parse(history.pop());
    syncControls();
    updateUndoButtons();
    render();
  });
  $('redoBtn').addEventListener('click', () => {
    if (!future.length) return;
    history.push(snapshot());
    state = JSON.parse(future.pop());
    syncControls();
    updateUndoButtons();
    render();
  });
  $('uploadInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    const id = 'upload-' + Date.now();
    images.set(id, img);
    pushHistory();
    state.panelPhotos[0] = id;
    buildPanelControls();
    render();
  });

  buildPanelControls();
  updateUndoButtons();
  await loadFonts();
  await render();
  window.__editorReady = true;
}

function syncControls() {
  $('captionInput').value = state.caption;
  $('subtitleInput').value = state.subtitle;
  $('gradeSelect').value = state.grade;
  $('layoutSelect').value = state.layout;
  $('sizeSelect').value = state.size;
  buildPanelControls();
}
