// main.js — editor wiring for Palm Heat Cover Studio.
// Loads the six bundled sample photos + the vendored fonts, renders the
// live cover preview on a canvas, and exposes the editor controls:
// caption/subtitle, layout, grade, export size, per-panel photo
// assignment, ink width, grain, undo/redo, PNG export.
// No network requests: every asset is a file under app/.

import { GRADES, GRADE_IDS, gradeById } from './grades.js';
import { LAYOUT_IDS, LAYOUT_NAMES } from './layouts.js';
import { SAMPLE_PHOTOS, DEFAULT_COVER, renderCover } from './cover.js';
import { runShot } from './shots.js';

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

export function sizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[2];
}

/** Load one image from a path under app/. Returns a promise of the element. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

export class Editor {
  constructor(canvas) {
    this.canvas = canvas;
    this.photos = new Map();
    this.state = {
      layout: DEFAULT_COVER.layout,
      grade: DEFAULT_COVER.grade,
      caption: DEFAULT_COVER.caption,
      subtitle: DEFAULT_COVER.subtitle,
      photos: [...DEFAULT_COVER.photos],
      size: '1920x1080',
      inkWidth: 2,
      grain: 8,
    };
    this.history = [cloneState(this.state)];
    this.historyIndex = 0;
    this.renderQueued = false;
  }

  async init() {
    await document.fonts.load('16px Anton');
    await document.fonts.load('16px Pacifico');
    for (const p of SAMPLE_PHOTOS) {
      this.photos.set(p.id, await loadImage(p.src));
    }
    this.render();
  }

  pushHistory() {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(cloneState(this.state));
    if (this.history.length > 50) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  set(patch, record = true) {
    Object.assign(this.state, patch);
    if (record) this.pushHistory();
    this.render();
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.state = cloneState(this.history[this.historyIndex]);
    this.render();
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.state = cloneState(this.history[this.historyIndex]);
    this.render();
  }

  canUndo() {
    return this.historyIndex > 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  /** Render the preview at a display-friendly resolution. */
  render() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      const size = sizeById(this.state.size);
      const scale = Math.min(1, 960 / size.w, 720 / size.h);
      this.canvas.width = Math.round(size.w * scale);
      this.canvas.height = Math.round(size.h * scale);
      renderCover(this.canvas, this.photos, this.state, {
        w: this.canvas.width,
        h: this.canvas.height,
      });
      this.updateUndoButtons();
    });
  }

  updateUndoButtons() {
    const undo = document.getElementById('undoBtn');
    const redo = document.getElementById('redoBtn');
    if (undo) undo.disabled = !this.canUndo();
    if (redo) redo.disabled = !this.canRedo();
  }

  /** Export the cover at full size as a PNG download. */
  exportPNG() {
    const size = sizeById(this.state.size);
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    renderCover(off, this.photos, this.state, size);
    off.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `palm-heat-${this.state.caption.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${size.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  }

  /** Randomize the panel photos (five different photos, never repeated). */
  shufflePhotos() {
    const ids = SAMPLE_PHOTOS.map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    this.set({ photos: ids.slice(0, 5) });
  }
}

// ---------------------------------------------------------------------------
// Page bootstrap
// ---------------------------------------------------------------------------
function option(value, label, selected) {
  return `<option value="${value}"${selected ? ' selected' : ''}>${label}</option>`;
}

export function buildControls(editor) {
  const s = editor.state;
  document.getElementById('captionInput').value = s.caption;
  document.getElementById('subtitleInput').value = s.subtitle;
  document.getElementById('layoutSelect').innerHTML = LAYOUT_IDS.map((id) =>
    option(id, LAYOUT_NAMES[id], id === s.layout),
  ).join('');
  document.getElementById('gradeSelect').innerHTML = GRADE_IDS.map((id) =>
    option(id, GRADES[id].name, id === s.grade),
  ).join('');
  document.getElementById('sizeSelect').innerHTML = EXPORT_SIZES.map((z) =>
    option(z.id, z.label, z.id === s.size),
  ).join('');
  document.getElementById('inkRange').value = s.inkWidth;
  document.getElementById('grainRange').value = s.grain;
  buildPanelPickers(editor);
}

export function buildPanelPickers(editor) {
  const wrap = document.getElementById('panelPickers');
  if (!wrap) return;
  wrap.innerHTML = '';
  editor.state.photos.forEach((photoId, i) => {
    const label = document.createElement('label');
    label.className = 'panel-picker';
    label.textContent = `Panel ${i + 1}${i === 0 ? ' (hero)' : ''}`;
    const sel = document.createElement('select');
    sel.innerHTML = SAMPLE_PHOTOS.map((p) =>
      option(p.id, p.label, p.id === photoId),
    ).join('');
    sel.addEventListener('change', () => {
      const photos = [...editor.state.photos];
      photos[i] = sel.value;
      editor.set({ photos });
    });
    label.appendChild(sel);
    wrap.appendChild(label);
  });
}

async function boot() {
  const params = new URLSearchParams(location.search);
  if (params.has('shot')) {
    await runShot(params);
    return;
  }
  const canvas = document.getElementById('coverCanvas');
  const editor = new Editor(canvas);
  buildControls(editor);
  await editor.init();

  document.getElementById('captionInput').addEventListener('input', (e) => {
    editor.set({ caption: e.target.value }, false);
  });
  document.getElementById('captionInput').addEventListener('change', () => editor.pushHistory());
  document.getElementById('subtitleInput').addEventListener('input', (e) => {
    editor.set({ subtitle: e.target.value }, false);
  });
  document.getElementById('subtitleInput').addEventListener('change', () => editor.pushHistory());
  document.getElementById('layoutSelect').addEventListener('change', (e) => editor.set({ layout: e.target.value }));
  document.getElementById('gradeSelect').addEventListener('change', (e) => editor.set({ grade: e.target.value }));
  document.getElementById('sizeSelect').addEventListener('change', (e) => editor.set({ size: e.target.value }));
  document.getElementById('inkRange').addEventListener('change', (e) => editor.set({ inkWidth: Number(e.target.value) }));
  document.getElementById('grainRange').addEventListener('change', (e) => editor.set({ grain: Number(e.target.value) }));
  document.getElementById('undoBtn').addEventListener('click', () => editor.undo());
  document.getElementById('redoBtn').addEventListener('click', () => editor.redo());
  document.getElementById('shuffleBtn').addEventListener('click', () => editor.shufflePhotos());
  document.getElementById('exportBtn').addEventListener('click', () => editor.exportPNG());
  document.getElementById('randomGradeBtn').addEventListener('click', () => {
    const id = GRADE_IDS[Math.floor(Math.random() * GRADE_IDS.length)];
    editor.set({ grade: id });
    document.getElementById('gradeSelect').value = id;
  });
}

document.addEventListener('DOMContentLoaded', boot);
