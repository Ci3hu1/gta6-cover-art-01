// Panel layout math for Palm Heat Cover Studio.
// Every layout returns 5 panel rects in fractional coordinates of the
// content area (0..1), plus an optional rotation per panel (degrees).
// The hero panel is always the big one, top-left, at least ~2x the area
// of a supporting panel — the Stephen Bliss comic-grid rule.
// Pure math — no DOM, so Node tests can import this file.

export const LAYOUTS = [
  { id: 'hero', name: 'Hero-led', desc: 'Big hero top-left, four supporting panels' },
  { id: 'classic', name: 'Classic Grid', desc: 'Three across the top, two wide below' },
  { id: 'portrait', name: 'Portrait', desc: 'Full-width hero, 2x2 grid beneath' },
  { id: 'wide', name: 'Wide', desc: 'Tall hero on the left, 2x2 grid on the right' },
  { id: 'tilted', name: 'Tilted Snapshots', desc: 'Hero grid, panels tilted like snapshots' },
];

// Fractional rects: { x, y, w, h } in 0..1 of the content area, rot in degrees.
export function layoutRects(layoutId, count = 5) {
  const r = (x, y, w, h, rot = 0) => ({ x, y, w, h, rot });
  switch (layoutId) {
    case 'classic':
      return [
        r(0, 0, 0.323, 0.49), r(0.3385, 0, 0.323, 0.49), r(0.677, 0, 0.323, 0.49),
        r(0, 0.51, 0.49, 0.49), r(0.51, 0.51, 0.49, 0.49),
      ].slice(0, count);
    case 'portrait':
      return [
        r(0, 0, 1, 0.42),
        r(0, 0.44, 0.49, 0.27), r(0.51, 0.44, 0.49, 0.27),
        r(0, 0.73, 0.49, 0.27), r(0.51, 0.73, 0.49, 0.27),
      ].slice(0, count);
    case 'wide':
      return [
        r(0, 0, 0.46, 1),
        r(0.48, 0, 0.25, 0.49), r(0.75, 0, 0.25, 0.49),
        r(0.48, 0.51, 0.25, 0.49), r(0.75, 0.51, 0.25, 0.49),
      ].slice(0, count);
    case 'tilted':
      return [
        r(0, 0, 0.585, 0.66, -2), r(0.6, 0, 0.4, 0.32, 1.5),
        r(0.6, 0.34, 0.4, 0.32, -1), r(0, 0.68, 0.49, 0.32, 2),
        r(0.51, 0.68, 0.49, 0.32, -1.5),
      ].slice(0, count);
    case 'hero':
    default:
      return [
        r(0, 0, 0.585, 0.66),
        r(0.6, 0, 0.4, 0.32), r(0.6, 0.34, 0.4, 0.32),
        r(0, 0.68, 0.49, 0.32), r(0.51, 0.68, 0.49, 0.32),
      ].slice(0, count);
  }
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// Scale fractional rects to pixel rects inside a content box.
export function scaleRects(rects, contentW, contentH) {
  return rects.map((p) => ({
    x: Math.round(p.x * contentW),
    y: Math.round(p.y * contentH),
    w: Math.max(1, Math.round(p.w * contentW)),
    h: Math.max(1, Math.round(p.h * contentH)),
    rot: p.rot || 0,
  }));
}

// Rect overlap area (0 when disjoint) — used by tests.
export function overlapArea(a, b) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}
