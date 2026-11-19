// Fixed scenes for screenshots: ?shot=cover renders a finished landscape cover
// full-viewport, ?shot=editor shows the editor with a sample photo loaded,
// ?shot=portrait a 1080x1350 cover, ?shot=layouts another layout. `photo` picks
// the sample (samples/<photo>.jpg), `caption` the words. window.__shotReady is
// set once the scene is painted with fonts loaded.
export function shotScene(shot) {
  switch (shot) {
    case 'portrait':
      return { mode: 'cover', size: '1080x1350', layout: 'grid4', grade: 'sunset', caption: 'PALM HEAT', subtitle: 'a sunset story in Leonida', stars: 5, badge: 'WANTED' };
    case 'layouts':
      return { mode: 'cover', size: '1920x1080', layout: 'tilted', grade: 'neon', caption: 'NEON DRIVE', subtitle: 'midnight on the boulevard', stars: 4, badge: 'HEAT 5' };
    case 'cover':
      return { mode: 'cover', size: '1920x1080', layout: 'hero3', grade: 'sunset', caption: 'PALM HEAT', subtitle: 'a sunset story in Leonida', stars: 5, badge: 'WANTED' };
    case 'editor':
    default:
      return { mode: 'editor', size: '1080x1080', layout: 'grid4', grade: 'sunset', caption: 'PALM HEAT', subtitle: 'a sunset story in Leonida', stars: 4, badge: 'WANTED' };
  }
}

export async function runShot(shot, query, apply) {
  const scene = shotScene(shot);
  if (query.get('caption')) scene.caption = query.get('caption');
  if (query.get('layout')) scene.layout = query.get('layout');
  if (query.get('grade')) scene.grade = query.get('grade');
  if (query.get('size')) scene.size = query.get('size');
  if (scene.mode === 'cover') document.body.classList.add('shot-cover');
  apply(scene);
  try {
    await document.fonts.load('80px Anton');
    await document.fonts.load('40px Pacifico');
    await document.fonts.ready;
  } catch { /* fonts fall back to system sans; the cover still renders */ }
  apply(scene);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
