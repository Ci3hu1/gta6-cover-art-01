// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor the app with a photo loaded, ?shot=portrait a portrait cover,
// ?shot=layouts five cells side by side: hero, grid, portrait, strip, plus
// the same hero in Neon Night to show the grades differ. `photos` picks
// the samples (comma list from samples/<id>.jpg) and `caption` the words.
// window.__shotReady is set once the scene is painted and the fonts are in.
import { renderCover, loadImage, sampleById, DEFAULT_COVER_PHOTOS } from './cover.js';

async function loadPhotos(ids) {
  const out = [];
  for (const id of ids) {
    const sample = sampleById(id.trim());
    out.push({ img: await loadImage(sample.file), sample });
  }
  return out;
}

function fivePhotos(photos) {
  const full = [...photos];
  let i = 0;
  while (full.length < 5) {
    const sample = sampleById(DEFAULT_COVER_PHOTOS[i % DEFAULT_COVER_PHOTOS.length]);
    full.push({ img: full[i % Math.max(1, photos.length)].img, sample });
    i++;
  }
  return full.slice(0, 5);
}

async function ready() {
  try {
    await Promise.all([
      document.fonts.load('16px Anton'),
      document.fonts.load('16px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    await document.fonts.ready;
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
}

export async function runShot(shot, query, api) {
  const canvas = document.getElementById('cover');
  const caption = query.get('caption') ?? 'PALM HEAT';
  const ids = (query.get('photos') ?? query.get('photo') ?? 'boulevard').split(',');
  const subtitle = query.get('subtitle') ?? 'a sunset story in Leonida';

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    canvas.width = 1280;
    canvas.height = 720;
    const photos = fivePhotos(await loadPhotos(ids));
    renderCover(canvas, { photos, caption, subtitle, layoutId: 'hero', gradeId: 'vice' });
    await ready();
    return;
  }

  if (shot === 'portrait') {
    document.body.classList.add('shot-cover');
    canvas.width = 1024;
    canvas.height = 1280;
    const photos = fivePhotos(await loadPhotos(ids));
    renderCover(canvas, { photos, caption, subtitle, layoutId: 'portrait', gradeId: 'vice' });
    await ready();
    return;
  }

  if (shot === 'layouts') {
    document.body.classList.add('shot-cover');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#14081F';
    ctx.fillRect(0, 0, 1280, 720);
    const photos = fivePhotos(await loadPhotos(ids));
    // Each mini is rendered at its own layout's natural aspect: the portrait
    // mini is tall, the rest landscape. Rendering a portrait layout into a
    // landscape cell breaks its composition, so it gets a tall cell.
    const cells = [
      { x: 8, y: 8, w: 628, h: 346, layoutId: 'hero', label: 'HERO-LED' },
      { x: 644, y: 8, w: 628, h: 346, layoutId: 'grid', label: 'CLASSIC GRID' },
      { x: 8, y: 366, w: 260, h: 346, layoutId: 'portrait', label: 'PORTRAIT' },
      { x: 276, y: 366, w: 620, h: 346, layoutId: 'strip', label: 'SUNSET STRIP' },
      // A second grade in hero layout, not the tilted layout: the tilted
      // snapshots read as a cream block at this size (the neon photo's bright
      // sky posterizes to the lightest tone), while a Neon Night mini proves
      // the grades are genuinely different.
      { x: 904, y: 366, w: 368, h: 346, layoutId: 'hero', gradeId: 'neon', label: 'NEON NIGHT' },
    ];
    for (const cell of cells) {
      const mini = document.createElement('canvas');
      mini.width = cell.w;
      mini.height = cell.h;
      renderCover(mini, { photos, caption, subtitle, layoutId: cell.layoutId, gradeId: cell.gradeId || 'vice' });
      ctx.drawImage(mini, cell.x, cell.y);
      ctx.fillStyle = 'rgba(20,8,31,0.85)';
      ctx.fillRect(cell.x, cell.y, 150, 26);
      ctx.fillStyle = '#FFD76B';
      ctx.font = 'bold 15px Anton, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.label, cell.x + 10, cell.y + 14);
    }
    await ready();
    return;
  }

  // editor: hand the first photo to the editor and let it render itself.
  const first = sampleById(ids[0].trim());
  const img = await loadImage(first.file);
  api.editorLoad(first, img, caption);
  await ready();
}
