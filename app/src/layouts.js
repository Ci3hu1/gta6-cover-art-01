// Palm Heat Cover Studio — layouts.js
// The panel grids. Every layout is a hero-led comic grid: one big hero
// panel (top-left, the GTA 6 cover keeps its hero there), supporting panels
// in varied sizes, diagonal visual flow, rule-of-thirds focal points.
// All coordinates are in cover pixels for the layout's native size.

export const MARGIN = 28;
export const GUTTER = 14;

export const LAYOUTS = [
  { id: 'hero', name: 'Hero-led', w: 1080, h: 1080 },
  { id: 'classic', name: 'Classic Grid', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide', w: 1920, h: 1080 },
  { id: 'tilted', name: 'Tilted Snapshots', w: 1080, h: 1080 },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

// Panel rects: { x, y, w, h, role, tilt? }. Exactly five panels per layout,
// one per photo in the default preset — a photo is never repeated in a poster.
export function layoutPanels(layoutId) {
  const M = MARGIN;
  const G = GUTTER;
  switch (layoutId) {
    case 'classic': {
      // 3 across the top, 2 wide across the bottom.
      const tw = (1080 - 2 * M - 2 * G) / 3;
      const th = 499;
      const bw = (1080 - 2 * M - G) / 2;
      const bh = 511;
      return [
        { x: M, y: M, w: tw, h: th, role: 'hero' },
        { x: M + tw + G, y: M, w: tw, h: th, role: 'support' },
        { x: M + 2 * (tw + G), y: M, w: tw, h: th, role: 'support' },
        { x: M, y: M + th + G, w: bw, h: bh, role: 'support' },
        { x: M + bw + G, y: M + th + G, w: bw, h: bh, role: 'support' },
      ];
    }
    case 'portrait': {
      // Hero full-width on top, 2x2 grid below.
      const cw = (1080 - 2 * M - G) / 2;
      const ch = 320;
      return [
        { x: M, y: M, w: 1080 - 2 * M, h: 640, role: 'hero' },
        { x: M, y: 682, w: cw, h: ch, role: 'support' },
        { x: M + cw + G, y: 682, w: cw, h: ch, role: 'support' },
        { x: M, y: 1016, w: cw, h: ch, role: 'support' },
        { x: M + cw + G, y: 1016, w: cw, h: ch, role: 'support' },
      ];
    }
    case 'wide': {
      // Hero down the whole left side, 2x2 grid on the right.
      const cw = (1920 - M - 880 - G - M - G) / 2;
      const ch = 505;
      return [
        { x: M, y: M, w: 880, h: 1024, role: 'hero' },
        { x: 922, y: M, w: cw, h: ch, role: 'support' },
        { x: 922 + cw + G, y: M, w: cw, h: ch, role: 'support' },
        { x: 922, y: M + ch + G, w: cw, h: ch, role: 'support' },
        { x: 922 + cw + G, y: M + ch + G, w: cw, h: ch, role: 'support' },
      ];
    }
    case 'tilted': {
      // Same grid as hero-led, but the supporting panels sit tilted like
      // taped-down snapshots, with a white polaroid border.
      return layoutPanels('hero').map((p, i) =>
        p.role === 'hero'
          ? p
          : { ...p, tilt: i % 2 === 0 ? -0.035 : 0.03, border: 10 },
      );
    }
    case 'hero':
    default: {
      // Hero 2x top-left, two stacked on the right, two wide on the bottom.
      return [
        { x: M, y: M, w: 640, h: 640, role: 'hero' },
        { x: 682, y: M, w: 370, h: 313, role: 'support' },
        { x: 682, y: 355, w: 370, h: 313, role: 'support' },
        { x: M, y: 682, w: 505, h: 370, role: 'support' },
        { x: 547, y: 682, w: 505, h: 370, role: 'support' },
      ];
    }
  }
}

// Native export sizes: square post, portrait post, wide post.
export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

export function exportSizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) ?? EXPORT_SIZES[0];
}
