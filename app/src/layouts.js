// layouts.js — panel geometry for Palm Heat Cover Studio.
// Every layout returns panels in normalized 0..1 coordinates over the
// cover canvas, each with a role ('hero' or 'support'). The hero panel is
// always the largest and sits top-left, following the GTA cover grammar
// (hero top-left, varied supporting panels, diagonal flow).
// Pure functions: no browser globals, unit-tested in tests/.

export const LAYOUT_IDS = ['hero', 'classic', 'portrait', 'wide', 'tilted'];

export const LAYOUT_NAMES = {
  hero: 'Hero-led',
  classic: 'Classic Grid',
  portrait: 'Portrait',
  wide: 'Wide',
  tilted: 'Tilted Snapshots',
};

/**
 * Panels for a layout on a canvas of width W and height H.
 * Returns [{x, y, w, h, role, tilt}] in pixels. Panels never overlap and
 * stay inside the canvas; a 6px white gutter separates them (comic grid).
 */
export function layoutPanels(id, W, H) {
  const g = 6; // gutter, px
  const P = (x, y, w, h, role, tilt = 0) => ({ x, y, w, h, role, tilt });
  switch (id) {
    case 'classic': {
      // 3 x 2 equal grid, all six photos, no single hero.
      const cw = (W - g * 4) / 3;
      const ch = (H - g * 3) / 2;
      const out = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          out.push(P(g + c * (cw + g), g + r * (ch + g), cw, ch, r === 0 && c === 0 ? 'hero' : 'support'));
        }
      }
      return out;
    }
    case 'portrait': {
      // Tall cover: hero across the top, 2 x 2 below.
      const contentH = H - g * 2;
      const heroH = contentH * 0.55;
      const restH = (contentH - heroH - g * 2) / 2;
      const cw = (W - g * 3) / 2;
      const y2 = g + heroH + g;
      const y3 = y2 + restH + g;
      return [
        P(g, g, W - g * 2, heroH, 'hero'),
        P(g, y2, cw, restH, 'support'),
        P(g * 2 + cw, y2, cw, restH, 'support'),
        P(g, y3, cw, restH, 'support'),
        P(g * 2 + cw, y3, cw, restH, 'support'),
      ];
    }
    case 'wide': {
      // Hero down the left, 2 x 2 grid on the right.
      const heroW = W * 0.4;
      const restW = W - heroW - g * 3;
      const cw = (restW - g) / 2;
      const ch = (H - g * 3) / 2;
      return [
        P(g, g, heroW, H - g * 2, 'hero'),
        P(heroW + g * 2, g, cw, ch, 'support'),
        P(heroW + g * 3 + cw, g, cw, ch, 'support'),
        P(heroW + g * 2, g * 2 + ch, cw, ch, 'support'),
        P(heroW + g * 3 + cw, g * 2 + ch, cw, ch, 'support'),
      ];
    }
    case 'tilted': {
      // Hero-led geometry, panels tilted like scattered snapshots.
      const base = layoutPanels('hero', W, H);
      const tilts = [0, 2.5, -2, 1.5, -1.5];
      return base.map((p, i) => ({ ...p, tilt: tilts[i % tilts.length] }));
    }
    case 'hero':
    default: {
      // Hero-led: hero 2x top-left, two stacked on the right, two across
      // the bottom. Five panels, five different photos.
      const heroW = W * 0.55;
      const heroH = H * 0.7;
      const rightW = W - heroW - g * 3;
      const rightH = (heroH - g) / 2;
      const botH = H - heroH - g * 3;
      const botW = (W - g * 3) / 2;
      return [
        P(g, g, heroW, heroH, 'hero'),
        P(heroW + g * 2, g, rightW, rightH, 'support'),
        P(heroW + g * 2, g * 2 + rightH, rightW, rightH, 'support'),
        P(g, heroH + g * 2, botW, botH, 'support'),
        P(botW + g * 2, heroH + g * 2, botW, botH, 'support'),
      ];
    }
  }
}

/** Area of a panel (px^2). */
export function panelArea(p) {
  return p.w * p.h;
}

/** True when the hero panel is the largest panel of the layout. */
export function heroIsLargest(panels) {
  const hero = panels.find((p) => p.role === 'hero');
  if (!hero) return false;
  return panels.every((p) => panelArea(p) <= panelArea(hero) + 1);
}
