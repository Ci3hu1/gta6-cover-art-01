// Leonida Nights Cover Studio v4 — studio UI.
// Loads the vendored fonts + sample photos, runs the live preview, the
// panel editor, undo/redo, "Surprise me" and the 3-size PNG export.
// Everything runs offline: no network request is ever made.

import { GRADES, DEFAULT_GRADE_ID } from './grades.js';
import { LAYOUTS, DEFAULT_LAYOUT_ID } from './layouts.js';
import { SAMPLES, FRAMES, EXPORT_SIZES, defaultState, renderPoster, resolvePanels } from './cover.js';
import { handleShotMode } from './shots.js';

const state = defaultState();
let exportSize = EXPORT_SIZES[0];
let undoStack = [];
let redoStack = [];

const $ = (id) => document.getElementById(id);
const preview = $('preview');

function serializable() {
  const { photos, ...rest } = state;
  return JSON.stringify({ ...rest, photoCount: photos.length });
}

function pushHistory() {
  undoStack.push(serializable());
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}

function applySnapshot(json) {
  const s = JSON.parse(json);
  const photos = state.photos;
  Object.assign(state, s);
  state.photos = photos;
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(serializable());
  applySnapshot(undoStack.pop());
  syncControls();
  render();
  updateUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(serializable());
  applySnapshot(redoStack.pop());
  syncControls();
  render();
  updateUndoButtons();
}

function updateUndoButtons() {
  $('undo-btn').disabled = !undoStack.length;
  $('redo-btn').disabled = !redoStack.length;
}

async function loadFonts() {
  const fonts = [
    new FontFace('Anton', 'url(fonts/Anton-Regular.ttf)'),
    new FontFace('Pacifico', 'url(fonts/Pacifico-Regular.ttf)'),
  ];
  for (const f of fonts) {
    try {
      await f.load();
      document.fonts.add(f);
    } catch (e) {
      console.warn('font failed', f.family, e);
    }
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  await Promise.all(state.photos.map(async (p) => {
    p.img = await loadImage(p.src);
  }));
}

function render() {
  renderPoster(preview, state, exportSize.w, exportSize.h);
  buildPanelList();
}

function renderOnly() {
  renderPoster(preview, state, exportSize.w, exportSize.h);
}

// ---- controls --------------------------------------------------------------

function buildLayoutButtons() {
  const wrap = $('layout-btns');
  wrap.innerHTML = '';
  for (const l of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'layout-btn' + (l.id === state.layoutId ? ' active' : '');
    b.textContent = l.name;
    b.title = l.blurb;
    b.addEventListener('click', () => {
      pushHistory();
      state.layoutId = l.id;
      syncControls();
      render();
    });
    wrap.appendChild(b);
  }
}

function buildGradeSwatches() {
  const wrap = $('grade-btns');
  wrap.innerHTML = '';
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'grade-btn' + (g.id === state.gradeId ? ' active' : '');
    b.style.background = `linear-gradient(135deg, rgb(${g.top[0]},${g.top[1]},${g.top[2]}) 0%, rgb(${g.bottom[0]},${g.bottom[1]},${g.bottom[2]}) 100%)`;
    b.textContent = g.name;
    b.title = g.name;
    b.addEventListener('click', () => {
      pushHistory();
      state.gradeId = g.id;
      syncControls();
      render();
    });
    wrap.appendChild(b);
  }
}

function buildFrameSelect() {
  const sel = $('frame-select');
  sel.innerHTML = '';
  for (const f of FRAMES) {
    const o = document.createElement('option');
    o.value = f.id;
    o.textContent = f.name;
    sel.appendChild(o);
  }
  sel.value = state.frameId;
  sel.addEventListener('change', () => {
    pushHistory();
    state.frameId = sel.value;
    render();
  });
}

function buildSizeButtons() {
  const wrap = $('size-btns');
  wrap.innerHTML = '';
  for (const s of EXPORT_SIZES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'size-btn' + (s.id === exportSize.id ? ' active' : '');
    b.textContent = s.name;
    b.addEventListener('click', () => {
      exportSize = s;
      syncControls();
      render();
    });
    wrap.appendChild(b);
  }
}

function photoOptions(select, current) {
  select.innerHTML = '';
  state.photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = `${p.role} — ${p.location}`;
    select.appendChild(o);
  });
  select.value = String(current);
}

function buildPanelList() {
  const wrap = $('panel-list');
  const resolved = resolvePanels(state);
  const focusId = document.activeElement?.dataset?.panel;
  wrap.innerHTML = '';
  resolved.forEach((r, idx) => {
    const row = document.createElement('div');
    row.className = 'panel-row';
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = `${r.panel.hero ? '★ ' : ''}Panel ${idx + 1}${r.panel.hero ? ' (Hero)' : ''}`;
    row.appendChild(title);

    const sel = document.createElement('select');
    sel.dataset.panel = r.panel.id;
    photoOptions(sel, state.photos.indexOf(r.photo));
    sel.addEventListener('change', () => {
      pushHistory();
      state.overrides[r.panel.id] = { ...(state.overrides[r.panel.id] || {}), photo: Number(sel.value) };
      render();
    });
    row.appendChild(labeled('Photo', sel));

    const zoom = document.createElement('input');
    zoom.type = 'range'; zoom.min = '1'; zoom.max = '2'; zoom.step = '0.05';
    zoom.value = String(r.zoom); zoom.dataset.panel = r.panel.id;
    zoom.addEventListener('input', () => {
      state.overrides[r.panel.id] = { ...(state.overrides[r.panel.id] || {}), zoom: Number(zoom.value) };
      renderOnly();
    });
    zoom.addEventListener('change', pushHistory);
    row.appendChild(labeled('Zoom', zoom));

    const panX = document.createElement('input');
    panX.type = 'range'; panX.min = '-1'; panX.max = '1'; panX.step = '0.05';
    panX.value = String(r.panX); panX.dataset.panel = r.panel.id;
    panX.addEventListener('input', () => {
      state.overrides[r.panel.id] = { ...(state.overrides[r.panel.id] || {}), panX: Number(panX.value) };
      renderOnly();
    });
    panX.addEventListener('change', pushHistory);
    row.appendChild(labeled('Pan ↔', panX));

    const panY = document.createElement('input');
    panY.type = 'range'; panY.min = '-1'; panY.max = '1'; panY.step = '0.05';
    panY.value = String(r.panY); panY.dataset.panel = r.panel.id;
    panY.addEventListener('input', () => {
      state.overrides[r.panel.id] = { ...(state.overrides[r.panel.id] || {}), panY: Number(panY.value) };
      renderOnly();
    });
    panY.addEventListener('change', pushHistory);
    row.appendChild(labeled('Pan ↕', panY));

    const flip = document.createElement('button');
    flip.type = 'button';
    flip.textContent = r.flip ? 'Unflip' : 'Flip';
    flip.addEventListener('click', () => {
      pushHistory();
      state.overrides[r.panel.id] = { ...(state.overrides[r.panel.id] || {}), flip: !r.flip };
      render();
    });
    row.appendChild(flip);

    const role = document.createElement('input');
    role.type = 'text'; role.value = r.role; role.maxLength = 24;
    role.addEventListener('change', () => {
      pushHistory();
      state.overrides[r.panel.id] = { ...(state.overrides[r.panel.id] || {}), role: role.value.toUpperCase() || r.role };
      render();
    });
    row.appendChild(labeled('Role tag', role));

    const loc = document.createElement('input');
    loc.type = 'text'; loc.value = r.location; loc.maxLength = 32;
    loc.addEventListener('change', () => {
      pushHistory();
      state.overrides[r.panel.id] = { ...(state.overrides[r.panel.id] || {}), location: loc.value || r.location };
      render();
    });
    row.appendChild(labeled('Place / time', loc));

    wrap.appendChild(row);
  });
  if (focusId) {
    const el = wrap.querySelector(`[data-panel="${focusId}"]`);
    if (el) el.focus();
  }
}

function labeled(label, el) {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  const span = document.createElement('span');
  span.textContent = label;
  wrap.appendChild(span);
  wrap.appendChild(el);
  return wrap;
}

function syncControls() {
  $('title-input').value = state.title;
  $('subtitle-input').value = state.subtitle;
  $('tagline-input').value = state.tagline;
  $('ink-toggle').checked = state.posterInk;
  $('grain-toggle').checked = state.grain;
  $('vignette-toggle').checked = state.vignette;
  $('frame-select').value = state.frameId;
  buildLayoutButtons();
  buildGradeSwatches();
  buildSizeButtons();
}

function bindControls() {
  $('title-input').addEventListener('change', (e) => {
    pushHistory();
    state.title = e.target.value.toUpperCase() || 'LEONIDA NIGHTS';
    render();
  });
  $('subtitle-input').addEventListener('change', (e) => {
    pushHistory();
    state.subtitle = e.target.value || 'Vice City Nights';
    render();
  });
  $('tagline-input').addEventListener('change', (e) => {
    pushHistory();
    state.tagline = e.target.value.toUpperCase() || state.tagline;
    render();
  });
  $('ink-toggle').addEventListener('change', (e) => {
    pushHistory();
    state.posterInk = e.target.checked;
    render();
  });
  $('grain-toggle').addEventListener('change', (e) => {
    pushHistory();
    state.grain = e.target.checked;
    render();
  });
  $('vignette-toggle').addEventListener('change', (e) => {
    pushHistory();
    state.vignette = e.target.checked;
    render();
  });
  $('undo-btn').addEventListener('click', undo);
  $('redo-btn').addEventListener('click', redo);
  $('surprise-btn').addEventListener('click', () => {
    pushHistory();
    const layouts = LAYOUTS.filter((l) => l.id !== state.layoutId);
    state.layoutId = layouts[Math.floor(Math.random() * layouts.length)].id;
    const grades = GRADES.filter((g) => g.id !== state.gradeId);
    state.gradeId = grades[Math.floor(Math.random() * grades.length)].id;
    // Shuffle the photo order across panels.
    const order = state.photos.map((_, i) => i).sort(() => Math.random() - 0.5);
    const layout = LAYOUTS.find((l) => l.id === state.layoutId);
    layout.panels.forEach((p, i) => {
      state.overrides[p.id] = { ...(state.overrides[p.id] || {}), photo: order[i % order.length] };
    });
    syncControls();
    render();
  });
  $('auto-btn').addEventListener('click', () => {
    pushHistory();
    // Auto layout: pick the layout whose hero best fits the hero photo's
    // aspect (tall photo → tall hero, wide photo → wide hero).
    const hero = state.photos[0].img;
    const ratio = hero ? hero.naturalWidth / hero.naturalHeight : 1.33;
    state.layoutId = ratio > 1.4 ? 'wide-hero' : ratio < 1 ? 'portrait' : 'popout';
    syncControls();
    render();
  });
  $('export-btn').addEventListener('click', () => exportPNG(exportSize));
  $('export-all-btn').addEventListener('click', () => {
    for (const s of EXPORT_SIZES) exportPNG(s);
  });
  $('add-photos').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      try {
        const img = await loadImage(url);
        state.photos.push({
          src: url,
          role: 'THE NEWCOMER',
          location: 'Leonida 6:00 PM',
          fx: 0.5, fy: 0.35,
          img,
        });
      } catch (err) {
        console.warn('photo failed', f.name, err);
      }
    }
    e.target.value = '';
    render();
  });
}

async function exportPNG(size) {
  const off = document.createElement('canvas');
  renderPoster(off, state, size.w, size.h);
  const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `leonida-nights-${size.id}-${size.w}x${size.h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---- boot ------------------------------------------------------------------

async function boot() {
  buildLayoutButtons();
  buildGradeSwatches();
  buildFrameSelect();
  buildSizeButtons();
  bindControls();
  updateUndoButtons();
  await loadFonts();
  await loadSamples();
  const shot = handleShotMode(state, preview, exportPNG);
  if (shot) {
    // Shot scenes render themselves; mark ready for the screenshot runner.
    document.body.dataset.ready = '1';
    return;
  }
  syncControls();
  render();
  document.body.dataset.ready = '1';
}

boot().catch((err) => {
  console.error(err);
  document.body.dataset.ready = 'error';
  document.body.dataset.error = String(err);
});
