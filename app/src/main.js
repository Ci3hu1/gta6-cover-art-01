// Palm Heat Cover Studio — editor wiring.
// Loads photos (six bundled samples + user uploads), keeps the poster
// state, renders the live preview through the comic-ink pipeline, and
// exports PNGs. Fully offline: every file it loads lives under app/.

import { processPhoto, renderCover } from './cover.js';
import { GRADES, gradeById } from './grades.js';
import { LAYOUTS, layoutRects, scaleRects } from './layouts.js';

export const SAMPLES = [
  { id: 'boulevard', file: 'samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'pier', file: 'samples/pier.jpg', label: 'Pier' },
  { id: 'car', file: 'samples/car.jpg', label: 'Vice Car' },
  { id: 'skyline', file: 'samples/skyline.jpg', label: 'Skyline' },
  { id: 'crowd', file: 'samples/crowd.jpg', label: 'Beach Crowd' },
  { id: 'neon', file: 'samples/neon.jpg', label: 'Neon Street' },
];

export const SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait 1080' },
  { id: '1920x1080', w: 1920, h: 1080, label: 'Wide 1920' },
];

export function defaultState() {
  return {
    layout: 'hero',
    grade: 'vice',
    size: '1080x1080',
    title: 'PALM HEAT',
    subtitle: 'a sunset story in Leonida',
    grain: true,
    vignette: true,
    selected: 0,
    panels: [
      { photo: 'boulevard', zoom: 1, ox: 0.5, oy: 0.45 },
      { photo: 'pier', zoom: 1, ox: 0.5, oy: 0.45 },
      { photo: 'car', zoom: 1, ox: 0.5, oy: 0.45 },
      { photo: 'skyline', zoom: 1, ox: 0.5, oy: 0.7 },
      { photo: 'neon', zoom: 1, ox: 0.5, oy: 0.5 },
    ],
  };
}

const images = new Map(); // photo id -> HTMLImageElement
const inkedCache = new Map(); // `${photoId}|${gradeId}` -> inked canvas
const uploads = new Map(); // upload id -> { file, label }

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function ensureImage(photoId) {
  if (images.has(photoId)) return images.get(photoId);
  const sample = SAMPLES.find((s) => s.id === photoId);
  if (!sample) throw new Error('unknown photo ' + photoId);
  const img = await loadImage(sample.file);
  images.set(photoId, img);
  return img;
}

async function ensureInked(photoId, grade) {
  const key = `${photoId}|${grade.id}`;
  if (inkedCache.has(key)) return inkedCache.get(key);
  const img = await ensureImage(photoId);
  const inked = processPhoto(img, grade, { inkWidth: 2, seed: 7 });
  inkedCache.set(key, inked);
  return inked;
}

// Build the render state (with inked canvases) from the editor state.
export async function buildRenderState(state) {
  const grade = gradeById(state.grade);
  const panels = [];
  for (const p of state.panels) {
    const inked = await ensureInked(p.photo, grade);
    panels.push({ ...p, inked });
  }
  return {
    layout: state.layout,
    grade,
    title: state.title,
    subtitle: state.subtitle,
    grain: state.grain,
    vignette: state.vignette,
    panels,
  };
}

export function sizeById(id) {
  return SIZES.find((s) => s.id === id) || SIZES[0];
}

// ---- editor ----

let state = defaultState();
let history = [];
let future = [];
let previewRects = []; // pixel rects of panels on the preview canvas
let previewBox = { w: 0, h: 0 }; // preview canvas size in px
let fontsReady = false;

const $ = (id) => document.getElementById(id);

function snapshot() {
  return JSON.parse(JSON.stringify(state));
}

function pushHistory() {
  history.push(snapshot());
  if (history.length > 50) history.shift();
  future = [];
  syncUndoRedo();
}

function syncUndoRedo() {
  $('undoBtn').disabled = history.length === 0;
  $('redoBtn').disabled = future.length === 0;
}

async function renderPreview() {
  const canvas = $('preview');
  const size = sizeById(state.size);
  // Preview at most 720px on the long side, same aspect as the export size.
  const scale = Math.min(1, 720 / Math.max(size.w, size.h));
  const pw = Math.round(size.w * scale);
  const ph = Math.round(size.h * scale);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  previewBox = { w: pw, h: ph };
  const ctx = canvas.getContext('2d');
  const renderState = await buildRenderState(state);
  renderCover(ctx, pw, ph, renderState);
  const titleH = Math.round(ph * 0.16);
  previewRects = scaleRects(layoutRects(state.layout, state.panels.length), pw, ph - titleH)
    .map((r) => ({ ...r }));
  $('panelLabel').textContent = `Panel ${state.selected + 1} of ${state.panels.length} — ${panelPhotoLabel(state.panels[state.selected])}`;
  const sel = state.panels[state.selected];
  $('zoomRange').value = String(sel.zoom);
}

function panelPhotoLabel(panel) {
  const sample = SAMPLES.find((s) => s.id === panel.photo);
  if (sample) return sample.label;
  const up = uploads.get(panel.photo);
  return up ? up.label : panel.photo;
}

function renderControls() {
  // Grades.
  const gradeRow = $('gradeRow');
  gradeRow.innerHTML = '';
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.className = 'swatch' + (state.grade === g.id ? ' active' : '');
    b.title = g.name;
    b.style.background = `linear-gradient(135deg, rgb(${g.palette[1].join(',')}), rgb(${g.palette[3].join(',')}))`;
    b.textContent = g.name;
    b.onclick = () => { pushHistory(); state.grade = g.id; renderControls(); renderPreview(); };
    gradeRow.appendChild(b);
  }
  // Layouts.
  const layoutRow = $('layoutRow');
  layoutRow.innerHTML = '';
  for (const l of LAYOUTS) {
    const b = document.createElement('button');
    b.className = 'pill' + (state.layout === l.id ? ' active' : '');
    b.textContent = l.name;
    b.title = l.desc;
    b.onclick = () => { pushHistory(); state.layout = l.id; renderControls(); renderPreview(); };
    layoutRow.appendChild(b);
  }
  // Sizes.
  for (const s of SIZES) {
    const b = document.querySelector(`[data-size="${s.id}"]`);
    if (b) b.classList.toggle('active', state.size === s.id);
  }
  // Photo library.
  const photoRow = $('photoRow');
  photoRow.innerHTML = '';
  const addThumb = (id, label, src) => {
    const b = document.createElement('button');
    b.className = 'thumb' + (state.panels[state.selected]?.photo === id ? ' active' : '');
    b.title = label;
    const img = document.createElement('img');
    img.src = src;
    img.alt = label;
    b.appendChild(img);
    const cap = document.createElement('span');
    cap.textContent = label;
    b.appendChild(cap);
    b.onclick = async () => {
      pushHistory();
      state.panels[state.selected].photo = id;
      state.panels[state.selected].zoom = 1;
      state.panels[state.selected].ox = 0.5;
      state.panels[state.selected].oy = 0.5;
      renderControls();
      await renderPreview();
    };
    photoRow.appendChild(b);
  };
  for (const s of SAMPLES) addThumb(s.id, s.label, s.file);
  for (const [id, up] of uploads) addThumb(id, up.label, up.dataUrl);
}

async function exportPNG() {
  const size = sizeById(state.size);
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const renderState = await buildRenderState(state);
  renderCover(ctx, size.w, size.h, renderState);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `palm-heat-${size.id}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function hitPanel(clientX, clientY) {
  const canvas = $('preview');
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * previewBox.w;
  const y = ((clientY - rect.top) / rect.height) * previewBox.h;
  for (let i = previewRects.length - 1; i >= 0; i--) {
    const r = previewRects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

export async function initEditor() {
  // Load the bundled fonts (local files, no network).
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
    fontsReady = true;
  } catch {
    fontsReady = false;
  }
  // Preload the six samples so the first paint is complete.
  await Promise.all(SAMPLES.map((s) => ensureImage(s.id).catch(() => null)));

  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('titleInput').addEventListener('input', () => { state.title = $('titleInput').value; renderPreview(); });
  $('subtitleInput').addEventListener('input', () => { state.subtitle = $('subtitleInput').value; renderPreview(); });
  $('titleInput').addEventListener('change', pushHistory);
  $('subtitleInput').addEventListener('change', pushHistory);
  $('grainToggle').checked = state.grain;
  $('vignetteToggle').checked = state.vignette;
  $('grainToggle').addEventListener('change', () => { pushHistory(); state.grain = $('grainToggle').checked; renderPreview(); });
  $('vignetteToggle').addEventListener('change', () => { pushHistory(); state.vignette = $('vignetteToggle').checked; renderPreview(); });
  $('zoomRange').addEventListener('input', () => {
    state.panels[state.selected].zoom = Number($('zoomRange').value);
    renderPreview();
  });
  $('zoomRange').addEventListener('change', pushHistory);
  for (const s of SIZES) {
    document.querySelector(`[data-size="${s.id}"]`).addEventListener('click', () => {
      pushHistory();
      state.size = s.id;
      renderControls();
      renderPreview();
    });
  }
  $('undoBtn').addEventListener('click', () => {
    if (!history.length) return;
    future.push(snapshot());
    state = history.pop();
    syncInputs();
    renderControls();
    renderPreview();
  });
  $('redoBtn').addEventListener('click', () => {
    if (!future.length) return;
    history.push(snapshot());
    state = future.pop();
    syncInputs();
    renderControls();
    renderPreview();
  });
  $('exportBtn').addEventListener('click', exportPNG);
  $('loadSamplesBtn').addEventListener('click', async () => {
    pushHistory();
    const ids = ['boulevard', 'pier', 'car', 'skyline', 'neon'];
    const oys = [0.45, 0.45, 0.45, 0.7, 0.5];
    state.panels.forEach((p, i) => { p.photo = ids[i % ids.length]; p.zoom = 1; p.ox = 0.5; p.oy = oys[i % oys.length]; });
    renderControls();
    await renderPreview();
  });
  $('uploadInput').addEventListener('change', async () => {
    const files = [...$('uploadInput').files].slice(0, 6);
    for (const file of files) {
      const dataUrl = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(file);
      });
      const id = 'up-' + Math.random().toString(36).slice(2, 8);
      const img = await loadImage(dataUrl);
      images.set(id, img);
      uploads.set(id, { label: file.name.replace(/\.[^.]+$/, '').slice(0, 14) || 'Photo', dataUrl });
    }
    renderControls();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); $('undoBtn').click(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); $('redoBtn').click(); }
  });

  // Drag on the preview pans the selected panel; click selects a panel.
  const canvas = $('preview');
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const hit = hitPanel(e.clientX, e.clientY);
    if (hit >= 0) {
      state.selected = hit;
      renderControls();
      renderPreview();
      drag = { x: e.clientX, y: e.clientY, ox: state.panels[hit].ox, oy: state.panels[hit].oy };
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const panel = state.panels[state.selected];
    const pr = previewRects[state.selected];
    if (!pr) return;
    const dx = ((e.clientX - drag.x) / rect.width) * (previewBox.w / pr.w);
    const dy = ((e.clientY - drag.y) / rect.height) * (previewBox.h / pr.h);
    panel.ox = Math.max(0, Math.min(1, drag.ox - dx * 0.5));
    panel.oy = Math.max(0, Math.min(1, drag.oy - dy * 0.5));
    renderPreview();
  });
  canvas.addEventListener('pointerup', () => { if (drag) { pushHistory(); drag = null; } });

  renderControls();
  syncUndoRedo();
  await renderPreview();

  // API for the screenshot scenes (shots.js) and for debugging.
  window.__coverApp = {
    get state() { return state; },
    setState(patch) {
      state = { ...state, ...patch };
      syncInputs();
      renderControls();
      return renderPreview();
    },
    renderPreview,
    buildRenderState,
    ensureImage,
    fontsReady: () => fontsReady,
  };
}

function syncInputs() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('grainToggle').checked = state.grain;
  $('vignetteToggle').checked = state.vignette;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditor);
} else {
  initEditor();
}
