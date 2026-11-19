// Palm Heat Cover Studio — main.js
// Editor wiring: state, undo/redo, photo assignment, per-panel crop,
// presets, PNG export. The render itself lives in cover.js.

import { renderCover } from './cover.js';
import { GRADES } from './grades.js';
import { LAYOUTS, EXPORT_SIZES, layoutById, layoutPanels } from './layouts.js';
import { runShot } from './shots.js';

// Six bundled sample photos, each with its focal point. The focals are the
// v2.1 fix in data form: boulevard/pier keep the face (upper third) in
// frame, car centres the camera, skyline/crowd sit on the busy band of the
// photo (horizon / sunlit clearing) instead of the empty sky or the black
// foreground. Default preset uses five DIFFERENT photos, one per panel.
export const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard — woman, convertible', fx: 0.5, fy: 0.18, lift: 0 },
  { id: 'pier', label: 'Pier — fisherman', fx: 0.45, fy: 0.2, lift: 0 },
  { id: 'neon', label: 'Summit — mountain above clouds', fx: 0.65, fy: 0.6, lift: 0.08 },
  { id: 'car', label: 'Camera — dark B&W portrait', fx: 0.5, fy: 0.35, lift: 0.2 },
  { id: 'skyline', label: 'Sunset field — horizon band', fx: 0.5, fy: 0.72, lift: 0, zoom: 1.35 },
  { id: 'crowd', label: 'Park — sunlit clearing', fx: 0.5, fy: 0.55, lift: 0.12 },
];

export function sampleById(id) {
  return SAMPLES.find((s) => s.id === id) ?? SAMPLES[0];
}

export function defaultPanels() {
  return ['boulevard', 'pier', 'neon', 'car', 'skyline'].map((id) => {
    const s = sampleById(id);
    return { photo: s.id, fx: s.fx, fy: s.fy, zoom: s.zoom ?? 1, lift: s.lift };
  });
}

export function defaultState() {
  return {
    caption: 'PALM HEAT',
    subtitle: 'Leonida • Vice City',
    grade: 'vice-sunset',
    layout: 'hero',
    size: '1080x1080',
    panels: defaultPanels(),
  };
}

const images = new Map();
let state = defaultState();
let selected = 0;
const history = [];
let future = [];

function snapshot() {
  return JSON.stringify(state);
}
function pushHistory() {
  history.push(snapshot());
  if (history.length > 60) history.shift();
  future = [];
}
function restore(json) {
  state = JSON.parse(json);
  syncControls();
  render();
}

async function loadImage(id, src) {
  if (images.has(id)) return images.get(id);
  const img = new Image();
  img.src = src;
  await img.decode();
  images.set(id, img);
  return img;
}

async function loadSamples(ids) {
  for (const id of ids) {
    const src = id.startsWith('blob:') || id.startsWith('data:')
      ? id
      : `samples/${id}.jpg`;
    try {
      await loadImage(id, src);
    } catch {
      // A missing sample leaves its panel blank rather than breaking the app.
    }
  }
}

const $ = (id) => document.getElementById(id);

function previewSize() {
  const layout = layoutById(state.layout);
  const w = 640;
  return { w, h: Math.round((w * layout.h) / layout.w) };
}

function render() {
  const canvas = $('cover');
  const { w, h } = previewSize();
  canvas.width = w;
  canvas.height = h;
  renderCover(canvas, images, state);
  const sel = $('panelInfo');
  if (sel) {
    const p = state.panels[selected];
    sel.textContent = `Panel ${selected + 1} — ${sampleById(p.photo).label} · focal ${p.fx.toFixed(2)}, ${p.fy.toFixed(2)} · zoom ${p.zoom.toFixed(2)}x`;
  }
}

function syncControls() {
  $('caption').value = state.caption;
  $('subtitle').value = state.subtitle;
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-layout]').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === state.layout));
  $('size').value = state.size;
  document.querySelectorAll('.panel-pick').forEach((sel, i) => {
    sel.value = state.panels[i].photo;
  });
  const p = state.panels[selected];
  $('fx').value = p.fx;
  $('fy').value = p.fy;
  $('zoom').value = p.zoom;
  document.querySelectorAll('.panel-tab').forEach((b, i) =>
    b.classList.toggle('active', i === selected));
}

function buildControls() {
  const gradeBox = $('grades');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.dataset.grade = g.id;
    b.textContent = g.name;
    b.style.setProperty('--sw', g.palette[2]);
    b.addEventListener('click', () => {
      pushHistory();
      state.grade = g.id;
      syncControls();
      render();
    });
    gradeBox.appendChild(b);
  });
  const layoutBox = $('layouts');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.dataset.layout = l.id;
    b.textContent = l.name;
    b.addEventListener('click', () => {
      pushHistory();
      state.layout = l.id;
      syncControls();
      render();
    });
    layoutBox.appendChild(b);
  });
  const panelBox = $('panels');
  state.panels.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'panel-row';
    const tab = document.createElement('button');
    tab.className = 'panel-tab';
    tab.textContent = `Panel ${i + 1}`;
    tab.addEventListener('click', () => {
      selected = i;
      syncControls();
      render();
    });
    const sel = document.createElement('select');
    sel.className = 'panel-pick';
    SAMPLES.forEach((s) => {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.label;
      sel.appendChild(o);
    });
    sel.value = p.photo;
    sel.addEventListener('change', () => {
      pushHistory();
      const s = sampleById(sel.value);
      state.panels[i] = { photo: s.id, fx: s.fx, fy: s.fy, zoom: s.zoom ?? 1, lift: s.lift };
      syncControls();
      render();
    });
    row.append(tab, sel);
    panelBox.appendChild(row);
  });

  $('caption').addEventListener('input', (e) => {
    state.caption = e.target.value.toUpperCase().slice(0, 24) || 'PALM HEAT';
    render();
  });
  $('caption').addEventListener('change', pushHistory);
  $('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value.slice(0, 40);
    render();
  });
  $('subtitle').addEventListener('change', pushHistory);
  $('size').addEventListener('change', (e) => {
    pushHistory();
    state.size = e.target.value;
  });
  $('fx').addEventListener('input', (e) => {
    state.panels[selected].fx = Number(e.target.value);
    render();
  });
  $('fy').addEventListener('input', (e) => {
    state.panels[selected].fy = Number(e.target.value);
    render();
  });
  $('zoom').addEventListener('input', (e) => {
    state.panels[selected].zoom = Number(e.target.value);
    render();
  });
  for (const id of ['fx', 'fy', 'zoom']) $(id).addEventListener('change', pushHistory);
  $('undo').addEventListener('click', () => {
    if (!history.length) return;
    future.push(snapshot());
    restore(history.pop());
  });
  $('redo').addEventListener('click', () => {
    if (!future.length) return;
    history.push(snapshot());
    restore(future.pop());
  });
  $('exportBtn').addEventListener('click', exportPng);
  $('upload').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const id = `upload-${Date.now()}`;
    SAMPLES.push({ id, label: `Your photo — ${file.name}`, fx: 0.5, fy: 0.35, lift: 0, src: url });
    await loadImage(id, url);
    pushHistory();
    state.panels[selected] = { photo: id, fx: 0.5, fy: 0.35, zoom: 1, lift: 0 };
    document.querySelectorAll('.panel-pick').forEach((sel) => {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = SAMPLES[SAMPLES.length - 1].label;
      sel.appendChild(o);
    });
    syncControls();
    render();
  });
  document.querySelectorAll('[data-preset]').forEach((b) => {
    b.addEventListener('click', () => {
      pushHistory();
      applyPreset(b.dataset.preset);
      syncControls();
      render();
    });
  });
  $('cover').addEventListener('click', (e) => {
    const r = $('cover').getBoundingClientRect();
    const layout = layoutById(state.layout);
    const sx = (e.clientX - r.left) / r.width;
    const sy = (e.clientY - r.top) / r.height;
    // Hit-test the panel rects in layout space.
    const panels = layoutPanels(state.layout);
    const lx = sx * layout.w;
    const ly = sy * layout.h;
    const hit = panels.findIndex((p) => lx >= p.x && lx <= p.x + p.w && ly >= p.y && ly <= p.y + p.h);
    if (hit >= 0) {
      selected = hit;
      syncControls();
      render();
    }
  });
}

function applyPreset(name) {
  if (name === 'neon-portrait') {
    state = {
      ...defaultState(),
      caption: 'NEON DRIVE',
      subtitle: 'Vice City after dark',
      grade: 'neon-night',
      layout: 'portrait',
      size: '1080x1350',
      panels: ['pier', 'neon', 'car', 'crowd', 'skyline'].map((id) => {
        const s = sampleById(id);
        return { photo: s.id, fx: s.fx, fy: s.fy, zoom: s.zoom ?? 1, lift: s.lift };
      }),
    };
  } else if (name === 'noir-wide') {
    state = {
      ...defaultState(),
      caption: 'NIGHT SHIFT',
      subtitle: 'Leonida • Vice City',
      grade: 'noir-ink',
      layout: 'wide',
      size: '1920x1080',
    };
  } else {
    state = defaultState();
  }
}

async function exportPng() {
  const size = EXPORT_SIZES.find((s) => s.id === state.size) ?? EXPORT_SIZES[0];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  await document.fonts.ready;
  renderCover(off, images, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.caption.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${size.id}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

// API the screenshot scenes in shots.js drive.
export const shotApi = {
  get state() {
    return state;
  },
  set state(s) {
    state = s;
  },
  images,
  loadSamples,
  loadImage,
  async renderInto(canvas, override = {}) {
    await document.fonts.ready;
    renderCover(canvas, images, { ...state, ...override });
  },
};

async function init() {
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  await document.fonts.load('100px Anton');
  await document.fonts.load('40px Pacifico');
  await loadSamples(SAMPLES.map((s) => s.id));
  buildControls();
  if (shot) {
    if (shot === 'cover' || shot === 'layouts') document.body.classList.add('shot-cover');
    await runShot(shot, query, shotApi);
    if (shot === 'editor') {
      syncControls();
      render();
    }
    return;
  }
  syncControls();
  render();
  window.__palmHeat = { get state() { return state; }, render, exportPng };
}

init();
