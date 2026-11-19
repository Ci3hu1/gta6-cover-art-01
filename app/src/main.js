// Wires the Palm Heat Cover Studio: state, photos, per-panel crop/position,
// undo/redo, live preview and one-click PNG export. A `?shot=` query sets up a
// fixed scene for a screenshot instead (./shots.js).
import { drawCover } from './cover.js';
import { runShot } from './shots.js';
import { LAYOUTS, LAYOUT_IDS, SIZES, SIZE_IDS, layoutPanels } from './layouts.js';
import { GRADES, GRADE_IDS } from './grades.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

export const SAMPLE_PHOTOS = ['boulevard', 'pier'];

function defaultPanels() {
  // Focus the faces: boulevard's subject sits high in the frame, pier's too.
  const photos = ['boulevard', 'pier'];
  const focus = { boulevard: 0.42, pier: 0.30 };
  return Array.from({ length: 9 }, (_, i) => ({ photo: photos[i % 2], zoom: 1, ox: 0, oy: focus[photos[i % 2]] }));
}

export function defaultState() {
  return {
    layout: 'grid4',
    grade: 'sunset',
    size: '1080x1080',
    caption: 'PALM HEAT',
    subtitle: 'a sunset story in Leonida',
    stars: 5,
    badge: 'WANTED',
    grain: true,
    vignette: true,
    panels: defaultPanels(),
  };
}

let state = defaultState();
let selectedPanel = 0;
const images = {};
let customCount = 0;

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamples() {
  for (const name of SAMPLE_PHOTOS) {
    if (!images[name]) images[name] = await loadImage(`samples/${name}.jpg`);
  }
}

// ---- undo / redo -----------------------------------------------------------
const history = [];
let future = [];
function snapshot() { return JSON.stringify(state); }
function pushHistory() {
  history.push(snapshot());
  if (history.length > 50) history.shift();
  future = [];
  updateUndoButtons();
}
function restore(json) {
  state = JSON.parse(json);
  syncControls();
  render();
}
function undo() {
  if (!history.length) return;
  future.push(snapshot());
  restore(history.pop());
  updateUndoButtons();
}
function redo() {
  if (!future.length) return;
  history.push(snapshot());
  restore(future.pop());
  updateUndoButtons();
}
function updateUndoButtons() {
  $('undo').disabled = history.length === 0;
  $('redo').disabled = future.length === 0;
}

// ---- rendering -------------------------------------------------------------
function previewSize() {
  const size = SIZES[state.size] || SIZES['1080x1080'];
  const scale = Math.min(1, 640 / Math.max(size.w, size.h));
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

export function render() {
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot === 'cover' || shot === 'portrait' || shot === 'layouts') {
    canvas.width = canvas.clientWidth || window.innerWidth;
    canvas.height = canvas.clientHeight || window.innerHeight;
  } else {
    const { w, h } = previewSize();
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, canvas.width, canvas.height, state, images);
  drawSelection();
}

function drawSelection() {
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot === 'cover' || shot === 'portrait' || shot === 'layouts') return;
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  const panel = panels[selectedPanel];
  if (!panel) return;
  ctx.save();
  ctx.setLineDash([10, 6]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#7df9ff';
  ctx.strokeRect(panel.x + 2, panel.y + 2, panel.w - 4, panel.h - 4);
  ctx.restore();
}

function renderSoon() { requestAnimationFrame(render); }

// ---- export ----------------------------------------------------------------
export async function exportPNG(sizeId) {
  const size = SIZES[sizeId] || SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), size.w, size.h, { ...state, size: sizeId }, images);
  return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
}

async function downloadExport() {
  const blob = await exportPNG(state.size);
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `palm-heat-cover-${state.size}.png`;
  a.click();
  $('status').textContent = `Saved palm-heat-cover-${state.size}.png (${SIZES[state.size].w} x ${SIZES[state.size].h})`;
}

// ---- controls --------------------------------------------------------------
function buildPickers() {
  const layoutBox = $('layouts');
  LAYOUT_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.layout = id;
    b.textContent = LAYOUTS[id].label;
    b.addEventListener('click', () => { pushHistory(); state.layout = id; syncControls(); render(); });
    layoutBox.appendChild(b);
  });
  const gradeBox = $('grades');
  GRADE_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick grade';
    b.dataset.grade = id;
    b.textContent = GRADES[id].label;
    b.addEventListener('click', () => { pushHistory(); state.grade = id; syncControls(); render(); });
    gradeBox.appendChild(b);
  });
  const sizeBox = $('sizes');
  SIZE_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.size = id;
    b.textContent = SIZES[id].label;
    b.addEventListener('click', () => { pushHistory(); state.size = id; syncControls(); render(); });
    sizeBox.appendChild(b);
  });
}

function syncControls() {
  document.querySelectorAll('#layouts .pick').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades .pick').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizes .pick').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  $('caption').value = state.caption;
  $('subtitle').value = state.subtitle;
  $('badge').value = state.badge;
  $('stars').value = String(state.stars);
  $('grain').checked = state.grain !== false;
  $('vignette').checked = state.vignette !== false;
  $('zoom').value = String(Math.round(((state.panels[selectedPanel] || {}).zoom || 1) * 100));
  $('zoomLabel').textContent = `${Math.round(((state.panels[selectedPanel] || {}).zoom || 1) * 100)}%`;
  $('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${panelCount()}`;
  document.querySelectorAll('#photoPick .pick').forEach((b) => b.classList.toggle('active', (state.panels[selectedPanel] || {}).photo === b.dataset.photo));
}

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function wireControls() {
  $('caption').addEventListener('input', (e) => { state.caption = e.target.value; renderSoon(); });
  $('caption').addEventListener('change', pushHistory);
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; renderSoon(); });
  $('subtitle').addEventListener('change', pushHistory);
  $('badge').addEventListener('input', (e) => { state.badge = e.target.value; renderSoon(); });
  $('badge').addEventListener('change', pushHistory);
  $('stars').addEventListener('change', (e) => { pushHistory(); state.stars = Number(e.target.value); render(); });
  $('grain').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; render(); });
  $('vignette').addEventListener('change', (e) => { pushHistory(); state.vignette = e.target.checked; render(); });
  $('zoom').addEventListener('input', (e) => {
    const slot = state.panels[selectedPanel];
    slot.zoom = Number(e.target.value) / 100;
    $('zoomLabel').textContent = `${e.target.value}%`;
    renderSoon();
  });
  $('zoom').addEventListener('change', pushHistory);
  $('export').addEventListener('click', downloadExport);
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
  document.querySelectorAll('#photoPick .pick').forEach((b) => {
    b.addEventListener('click', () => {
      pushHistory();
      state.panels[selectedPanel].photo = b.dataset.photo;
      syncControls();
      render();
    });
  });
  $('fillAll').addEventListener('click', () => {
    pushHistory();
    const photo = state.panels[selectedPanel].photo;
    state.panels.forEach((p) => { p.photo = photo; });
    render();
  });
  $('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const id = `custom${++customCount}`;
    images[id] = await loadImage(URL.createObjectURL(file));
    pushHistory();
    state.panels[selectedPanel].photo = id;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick active';
    b.dataset.photo = id;
    b.textContent = file.name.slice(0, 18) || 'Your photo';
    b.addEventListener('click', () => {
      pushHistory();
      state.panels[selectedPanel].photo = id;
      syncControls();
      render();
    });
    $('photoPick').appendChild(b);
    syncControls();
    render();
  });
}

// ---- per-panel crop / position ---------------------------------------------
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}

function panelAt(x, y) {
  // Hit-test against the layout's panel rects (rotation ignored: close enough
  // for picking the tilted snapshots).
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(p.x, p.y);
  if (hit >= 0 && hit !== selectedPanel) {
    selectedPanel = hit;
    syncControls();
    render();
  }
  drag = { startX: p.x, startY: p.y, moved: false, slot: { ...state.panels[selectedPanel] } };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const dx = p.x - drag.startX;
  const dy = p.y - drag.startY;
  if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
  const slot = state.panels[selectedPanel];
  // Dragging a full panel height moves the focus from centre to edge.
  slot.ox = Math.min(0.5, Math.max(-0.5, drag.slot.ox + (dx / canvas.width) * 0.5 * (canvas.width / 640)));
  slot.oy = Math.min(0.5, Math.max(-0.5, drag.slot.oy + (dy / canvas.height) * 0.5 * (canvas.height / 640)));
  renderSoon();
});
canvas.addEventListener('pointerup', () => {
  if (drag && drag.moved) pushHistory();
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const slot = state.panels[selectedPanel];
  slot.zoom = Math.min(3, Math.max(0.5, slot.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  syncControls();
  renderSoon();
}, { passive: false });

// Panel picking: click a panel's row in the panel list, or press Tab through them.
function buildPanelList() {
  const box = $('panelList');
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick panel-btn';
    b.dataset.panel = String(i);
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => {
      selectedPanel = i;
      syncControls();
      render();
    });
    box.appendChild(b);
  }
}

// ---- boot ------------------------------------------------------------------
buildPickers();
buildPanelList();
wireControls();
syncControls();
updateUndoButtons();

window.__app = { get state() { return state; }, exportPNG, render, undo, redo };

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
loadSamples().then(async () => {
  try {
    await document.fonts.load('80px Anton');
    await document.fonts.load('40px Pacifico');
    await document.fonts.ready;
  } catch { /* fall back to system fonts */ }
  if (shot) {
    runShot(shot, params, (scene) => {
      state = { ...defaultState(), layout: scene.layout, grade: scene.grade, size: scene.size, caption: scene.caption, subtitle: scene.subtitle, stars: scene.stars, badge: scene.badge };
      syncControls();
      render();
    });
  } else {
    render();
  }
});
