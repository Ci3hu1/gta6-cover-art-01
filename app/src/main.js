// main.js — Leonida Nights Cover Studio: the 3-step studio flow.
//   1 Add photos (6 bundled samples + upload your own, smart face-aware crops)
//   2 Caption (title, subtitle, cast tags, title style, grade, finish)
//   3 Export PNG in 3 sizes (1080x1080 / 1080x1350 / 1920x1080)
// Fully offline: every asset is a file under app/. No network requests.

import { renderCover, exportCanvas, EXPORT_SIZES, SAMPLE_PHOTOS, defaultState } from './cover.js';
import { GRADES, gradeById } from './grades.js';
import { LAYOUTS, layoutPanels, layoutById } from './layouts.js';
import { parseShotParams, drawCoverShot, drawLayoutsShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const PREVIEW_ASPECT = { 'hero-led': [1, 1], grid: [1, 1], nine: [1, 1], portrait: [4, 5], wide: [16, 9], slanted: [16, 9] };

let state = defaultState();
let photos = SAMPLE_PHOTOS.map((p) => ({ ...p, img: null }));
let selectedPanel = 0;
let undoStack = [];
let redoStack = [];
let lastPanels = [];
let previewW = 600, previewH = 600;

function pushUndo() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(state));
  state = JSON.parse(undoStack.pop());
  syncInputs();
  render();
  updateUndoButtons();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(state));
  state = JSON.parse(redoStack.pop());
  syncInputs();
  render();
  updateUndoButtons();
}
function updateUndoButtons() {
  $('undoBtn').disabled = !undoStack.length;
  $('redoBtn').disabled = !redoStack.length;
}

function images() {
  // photo index -> loaded image (or null while loading)
  return photos.map((p) => p.img);
}

function render() {
  const canvas = $('preview');
  const [aw, ah] = PREVIEW_ASPECT[state.layout] || [1, 1];
  const maxSide = 600;
  previewW = aw >= ah ? maxSide : Math.round(maxSide * aw / ah);
  previewH = ah > aw ? maxSide : Math.round(maxSide * ah / aw);
  canvas.width = previewW; canvas.height = previewH;
  const ctx = canvas.getContext('2d');
  renderCover(ctx, previewW, previewH, state, images());
  lastPanels = layoutPanels(state.layout, previewW, previewH);
  $('panelLabel').textContent = `Panel ${selectedPanel + 1} — ${state.panels[selectedPanel].tag || 'untagged'} · ${photos[state.panels[selectedPanel].photo]?.label || 'photo'}`;
  $('layoutName').textContent = layoutById(state.layout).name;
  $('gradeName').textContent = gradeById(state.grade).name;
}

function syncInputs() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('tagInput').value = state.panels[selectedPanel].tag;
  $('zoomRange').value = state.panels[selectedPanel].zoom;
  $('panXRange').value = state.panels[selectedPanel].panX;
  $('panYRange').value = state.panels[selectedPanel].panY;
  $('flipBtn').textContent = state.panels[selectedPanel].flip ? 'Unflip' : 'Flip';
  $('grainToggle').checked = state.grain;
  $('vignetteToggle').checked = state.vignette;
  document.querySelectorAll('#layoutRow button').forEach((b) => b.classList.toggle('active', b.dataset.id === state.layout));
  document.querySelectorAll('#gradeRow button').forEach((b) => b.classList.toggle('active', b.dataset.id === state.grade));
}

function buildChips() {
  const layoutRow = $('layoutRow');
  layoutRow.innerHTML = '';
  for (const l of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = l.name; b.dataset.id = l.id;
    b.onclick = () => { pushUndo(); state.layout = l.id; syncInputs(); render(); };
    layoutRow.appendChild(b);
  }
  const gradeRow = $('gradeRow');
  gradeRow.innerHTML = '';
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = g.name; b.dataset.id = g.id;
    b.onclick = () => { pushUndo(); state.grade = g.id; syncInputs(); render(); };
    gradeRow.appendChild(b);
  }
  const strip = $('photoStrip');
  strip.innerHTML = '';
  photos.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'thumb';
    d.title = p.label;
    const im = document.createElement('img');
    im.src = p.src; im.alt = p.label;
    im.onclick = () => { pushUndo(); state.panels[selectedPanel].photo = i; syncInputs(); render(); };
    d.appendChild(im);
    const cap = document.createElement('span');
    cap.textContent = p.label;
    d.appendChild(cap);
    strip.appendChild(d);
  });
}

function exportPng(size) {
  const canvas = exportCanvas(size.w, size.h, state, images());
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-nights-${size.id}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function surpriseMe() {
  pushUndo();
  state.layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id;
  state.grade = GRADES[Math.floor(Math.random() * GRADES.length)].id;
  const order = photos.map((_, i) => i).sort(() => Math.random() - 0.5);
  state.panels.forEach((p, i) => { p.photo = order[i % order.length]; });
  syncInputs(); render();
}

function loadAllPhotos() {
  return Promise.all(photos.map((p) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { p.img = img; resolve(); };
    img.onerror = () => resolve();
    img.src = p.src;
  })));
}

function initStudio() {
  buildChips();
  syncInputs();

  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value.toUpperCase(); render(); });
  $('titleInput').addEventListener('change', pushUndo);
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('subtitleInput').addEventListener('change', pushUndo);
  $('tagInput').addEventListener('input', (e) => { state.panels[selectedPanel].tag = e.target.value.toUpperCase(); render(); });
  $('tagInput').addEventListener('change', pushUndo);
  $('zoomRange').addEventListener('input', (e) => { state.panels[selectedPanel].zoom = Number(e.target.value); render(); });
  $('zoomRange').addEventListener('change', pushUndo);
  $('panXRange').addEventListener('input', (e) => { state.panels[selectedPanel].panX = Number(e.target.value); render(); });
  $('panXRange').addEventListener('change', pushUndo);
  $('panYRange').addEventListener('input', (e) => { state.panels[selectedPanel].panY = Number(e.target.value); render(); });
  $('panYRange').addEventListener('change', pushUndo);
  $('flipBtn').onclick = () => { pushUndo(); state.panels[selectedPanel].flip = !state.panels[selectedPanel].flip; syncInputs(); render(); };
  $('swapBtn').onclick = () => {
    pushUndo();
    const next = (selectedPanel + 1) % state.panels.length;
    const a = state.panels[selectedPanel], b = state.panels[next];
    [a.photo, b.photo] = [b.photo, a.photo];
    [a.tag, b.tag] = [b.tag, a.tag];
    syncInputs(); render();
  };
  $('undoBtn').onclick = undo;
  $('redoBtn').onclick = redo;
  $('surpriseBtn').onclick = surpriseMe;
  $('autoBtn').onclick = () => {
    pushUndo();
    const i = LAYOUTS.findIndex((l) => l.id === state.layout);
    state.layout = LAYOUTS[(i + 1) % LAYOUTS.length].id;
    syncInputs(); render();
  };
  $('grainToggle').onchange = (e) => { pushUndo(); state.grain = e.target.checked; render(); };
  $('vignetteToggle').onchange = (e) => { pushUndo(); state.vignette = e.target.checked; render(); };

  $('preview').addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (previewW / rect.width);
    const y = (e.clientY - rect.top) * (previewH / rect.height);
    const hit = lastPanels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
    if (hit >= 0) { selectedPanel = hit; syncInputs(); render(); }
  });

  const exportRow = $('exportRow');
  exportRow.innerHTML = '';
  for (const s of EXPORT_SIZES) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'export';
    b.textContent = `PNG ${s.label}`;
    b.onclick = () => exportPng(s);
    exportRow.appendChild(b);
  }

  $('uploadInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        pushUndo();
        photos.push({ id: `up${photos.length}`, file: '', label: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Uploaded', src: reader.result, img });
        state.panels[selectedPanel].photo = photos.length - 1;
        buildChips(); syncInputs(); render();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  updateUndoButtons();
  render();
}

// Screenshot scenes: ?shot=cover | portrait | layouts renders the scene
// full-window and skips the studio chrome.
async function initShot(params) {
  document.body.classList.add('shot');
  const canvas = $('shotCanvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  await loadAllPhotos();
  try {
    await document.fonts.load('40px Anton');
    await document.fonts.load('40px Pacifico');
    await document.fonts.ready;
  } catch { /* fonts fall back; render anyway */ }
  const ctx = canvas.getContext('2d');
  if (params.mode === 'layouts') drawLayoutsShot(ctx, canvas.width, canvas.height, params, images());
  else drawCoverShot(ctx, canvas.width, canvas.height, params, images());
  document.title = `shot:${params.mode}`;
}

async function init() {
  const params = parseShotParams(window.location.search);
  if (params && params.mode !== 'editor') {
    await initShot(params);
    return;
  }
  if (params && params.mode === 'editor') {
    state.title = params.title;
    state.subtitle = params.subtitle;
  }
  await loadAllPhotos();
  try {
    await document.fonts.load('40px Anton');
    await document.fonts.load('40px Pacifico');
    await document.fonts.ready;
  } catch { /* render anyway */ }
  initStudio();
  render();
}

init();
