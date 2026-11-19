// Wires the Palm Heat editor: pick photos per panel, type a caption, choose a
// layout and a grade, drag a panel to reframe it, scroll to zoom it, undo/redo
// any change, export the cover as a PNG. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).
import { renderCover, loadImage, sampleById, SAMPLES, DEFAULT_COVER_PHOTOS } from './cover.js';
import { runShot } from './shots.js';
import { GRADES, gradeById } from './grades.js';
import { LAYOUTS, layoutPanels } from './layouts.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const layoutSelect = document.getElementById('layout');
const gradeSelect = document.getElementById('grade');
const sizeSelect = document.getElementById('size');
const statusEl = document.getElementById('status');

const state = {
  layoutId: 'hero',
  gradeId: 'vice',
  caption: 'PALM HEAT',
  subtitle: 'a sunset story in Leonida',
  size: '1080x1080',
  slots: [...DEFAULT_COVER_PHOTOS],
  pan: {}, // slot index -> { x, y } relative focus shift
  zoom: {}, // slot index -> zoom factor
};
const loaded = new Map(); // sample id -> { img, sample }
const history = [];
let historyIndex = -1;
let selectedSlot = 0;

function snapshot() {
  return JSON.stringify({
    layoutId: state.layoutId,
    gradeId: state.gradeId,
    caption: state.caption,
    subtitle: state.subtitle,
    size: state.size,
    slots: state.slots,
    pan: state.pan,
    zoom: state.zoom,
  });
}

function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  syncControls();
}

function pushHistory() {
  history.length = historyIndex + 1;
  history.push(snapshot());
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  updateUndoRedo();
}

function updateUndoRedo() {
  document.getElementById('undo').disabled = historyIndex <= 0;
  document.getElementById('redo').disabled = historyIndex >= history.length - 1;
}

function scenePhotos() {
  return state.slots.map((id, i) => {
    const entry = loaded.get(id);
    if (!entry) return null;
    const pan = state.pan[i] || { x: 0, y: 0 };
    const zoom = state.zoom[i] || 1;
    return {
      img: entry.img,
      sample: entry.sample,
      lift: entry.sample.lift,
      pan,
      zoom,
    };
  });
}

function render() {
  const photos = scenePhotos().filter(Boolean);
  if (!photos.length) return;
  renderCover(canvas, {
    photos,
    caption: state.caption,
    subtitle: state.subtitle,
    layoutId: state.layoutId,
    gradeId: state.gradeId,
  });
}

function syncControls() {
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
  layoutSelect.value = state.layoutId;
  gradeSelect.value = state.gradeId;
  sizeSelect.value = state.size;
  document.querySelectorAll('.panel-pick').forEach((sel, i) => {
    sel.value = state.slots[i] || DEFAULT_COVER_PHOTOS[i];
  });
}

async function ensureSample(id) {
  if (loaded.has(id)) return loaded.get(id);
  const sample = sampleById(id);
  const img = await loadImage(sample.file);
  const entry = { img, sample };
  loaded.set(id, entry);
  return entry;
}

async function loadAllSamples() {
  for (const s of SAMPLES) await ensureSample(s.id);
}

function fillSelects() {
  for (const sel of [layoutSelect]) {
    sel.innerHTML = '';
    for (const l of LAYOUTS) {
      const o = document.createElement('option');
      o.value = l.id;
      o.textContent = l.name;
      sel.appendChild(o);
    }
  }
  for (const sel of [gradeSelect]) {
    sel.innerHTML = '';
    for (const g of GRADES) {
      const o = document.createElement('option');
      o.value = g.id;
      o.textContent = g.name;
      sel.appendChild(o);
    }
  }
  document.querySelectorAll('.panel-pick').forEach((sel) => {
    sel.innerHTML = '';
    for (const s of SAMPLES) {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.id;
      sel.appendChild(o);
    }
  });
}

function panelAt(px, py) {
  const rect = canvas.getBoundingClientRect();
  const x = ((px - rect.left) / rect.width) * canvas.width;
  const y = ((py - rect.top) / rect.height) * canvas.height;
  const titleH = Math.round(canvas.height * (canvas.width > canvas.height ? 0.21 : 0.16));
  const panels = layoutPanels(state.layoutId, canvas.width, canvas.height - titleH);
  return { panels, hit: panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h), x, y };
}

// Drag a panel to reframe it (shifts its focus), scroll to zoom it.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const { panels, hit, x, y } = panelAt(e.clientX, e.clientY);
  if (hit < 0) return;
  selectedSlot = hit;
  drag = { slot: hit, x, y, panel: panels[hit], moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = panelAt(e.clientX, e.clientY);
  const dx = (x - drag.x) / drag.panel.w;
  const dy = (y - drag.y) / drag.panel.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.005) drag.moved = true;
  const pan = state.pan[drag.slot] || { x: 0, y: 0 };
  state.pan[drag.slot] = {
    x: Math.max(-0.4, Math.min(0.4, pan.x - dx)),
    y: Math.max(-0.4, Math.min(0.4, pan.y - dy)),
  };
  drag.x = x;
  drag.y = y;
  render();
});
canvas.addEventListener('pointerup', () => {
  if (drag && drag.moved) pushHistory();
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const { hit } = panelAt(e.clientX, e.clientY);
  if (hit < 0) return;
  const z = state.zoom[hit] || 1;
  state.zoom[hit] = Math.max(1, Math.min(2.5, z * (e.deltaY < 0 ? 1.1 : 0.9)));
  render();
  pushHistory();
}, { passive: false });

captionInput.addEventListener('input', () => { state.caption = captionInput.value; render(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; render(); });
captionInput.addEventListener('change', pushHistory);
subtitleInput.addEventListener('change', pushHistory);
layoutSelect.addEventListener('change', () => { state.layoutId = layoutSelect.value; render(); pushHistory(); });
gradeSelect.addEventListener('change', () => { state.gradeId = gradeSelect.value; render(); pushHistory(); });
sizeSelect.addEventListener('change', () => { state.size = sizeSelect.value; });
document.querySelectorAll('.panel-pick').forEach((sel, i) => {
  sel.addEventListener('change', async () => {
    state.slots[i] = sel.value;
    await ensureSample(sel.value);
    render();
    pushHistory();
  });
});
document.getElementById('undo').addEventListener('click', () => {
  if (historyIndex <= 0) return;
  historyIndex--;
  restore(history[historyIndex]);
  updateUndoRedo();
  render();
});
document.getElementById('redo').addEventListener('click', () => {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  restore(history[historyIndex]);
  updateUndoRedo();
  render();
});
document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  const id = `up${Date.now() % 100000}`;
  const sample = { id, file: url, focus: { x: 0.5, y: 0.4 }, safe: { x: 0.2, y: 0.15, w: 0.6, h: 0.5 }, lift: 1.0 };
  loaded.set(id, { img, sample });
  SAMPLES.push(sample);
  fillSelects();
  syncControls();
  state.slots[selectedSlot] = id;
  syncControls();
  render();
  pushHistory();
  statusEl.textContent = 'Your photo is in — pick it in any panel.';
});
document.getElementById('export').addEventListener('click', async () => {
  const [w, h] = state.size.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const layoutId = w === h ? state.layoutId : w < h ? 'portrait' : state.layoutId;
  renderCover(off, {
    photos: scenePhotos().filter(Boolean),
    caption: state.caption,
    subtitle: state.subtitle,
    layoutId,
    gradeId: state.gradeId,
  });
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `palm-heat-${state.size}.png`;
    a.click();
    statusEl.textContent = `Saved palm-heat-${state.size}.png`;
  }, 'image/png');
});

async function boot() {
  fillSelects();
  syncControls();
  await loadAllSamples();
  try {
    await Promise.all([document.fonts.load('16px Anton'), document.fonts.load('16px Pacifico')]);
  } catch { /* fall back to system fonts */ }
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      editorLoad: async (sample, img, caption) => {
        loaded.set(sample.id, { img, sample });
        state.slots[0] = sample.id;
        state.caption = caption;
        captionInput.value = caption;
        syncControls();
        render();
      },
    });
    return;
  }
  render();
  pushHistory();
}

boot();
