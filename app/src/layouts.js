// Leonida Nights Cover Studio v4 — layouts.
// Rects are fractions of the poster (x/w of width, y/h of height).
// The grid always lives between the press-quote band (top) and the title
// block (bottom), so the title can never touch a face: every panel's face
// zone ends well above the title's top edge (see cover.js titleGeometry).

export const GRID = { x0: 0.028, x1: 0.972, y0: 0.095, y1: 0.635 };

// gap between panels, as a fraction of width
const GAP = 0.012;

function panel(id, x, y, w, h, opts = {}) {
  return { id, x, y, w, h, hero: !!opts.hero, popout: !!opts.popout, slant: !!opts.slant };
}

export const LAYOUTS = [
  {
    id: 'popout',
    name: 'Pop-Out Cast',
    blurb: 'Hero breaks out of the grid',
    panels: [
      panel('hero', 0.028, 0.095, 0.49, 0.54, { hero: true, popout: true }),
      panel('p2', 0.535, 0.095, 0.2125, 0.264),
      panel('p3', 0.7595, 0.095, 0.2125, 0.264),
      panel('p4', 0.535, 0.371, 0.2125, 0.264),
      panel('p5', 0.7595, 0.371, 0.2125, 0.264),
    ],
  },
  {
    id: 'hero-led',
    name: 'Hero Led',
    blurb: 'Big hero, three stacked',
    panels: [
      panel('hero', 0.028, 0.095, 0.52, 0.54, { hero: true }),
      panel('p2', 0.56, 0.095, 0.412, 0.172),
      panel('p3', 0.56, 0.279, 0.412, 0.172),
      panel('p4', 0.56, 0.463, 0.412, 0.172),
    ],
  },
  {
    id: 'classic',
    name: 'Classic Grid',
    blurb: 'Wide hero over three',
    panels: [
      panel('hero', 0.028, 0.095, 0.622, 0.264, { hero: true }),
      panel('p2', 0.662, 0.095, 0.31, 0.264),
      panel('p3', 0.028, 0.371, 0.305, 0.264),
      panel('p4', 0.345, 0.371, 0.305, 0.264),
      panel('p5', 0.662, 0.371, 0.31, 0.264),
    ],
  },
  {
    id: 'portrait',
    name: 'Portrait',
    blurb: 'Tall hero, four small',
    panels: [
      panel('hero', 0.028, 0.095, 0.46, 0.54, { hero: true }),
      panel('p2', 0.5, 0.095, 0.23, 0.264),
      panel('p3', 0.742, 0.095, 0.23, 0.264),
      panel('p4', 0.5, 0.371, 0.23, 0.264),
      panel('p5', 0.742, 0.371, 0.23, 0.264),
    ],
  },
  {
    id: 'wide-hero',
    name: 'Wide Hero',
    blurb: 'Full-width hero, four below',
    panels: [
      panel('hero', 0.028, 0.095, 0.944, 0.28, { hero: true }),
      panel('p2', 0.028, 0.387, 0.227, 0.248),
      panel('p3', 0.267, 0.387, 0.227, 0.248),
      panel('p4', 0.506, 0.387, 0.227, 0.248),
      panel('p5', 0.745, 0.387, 0.227, 0.248),
    ],
  },
  {
    id: 'slant',
    name: 'Slant',
    blurb: 'Diagonal panel cuts',
    panels: [
      panel('hero', 0.028, 0.095, 0.49, 0.54, { hero: true, slant: true }),
      panel('p2', 0.535, 0.095, 0.2125, 0.264, { slant: true }),
      panel('p3', 0.7595, 0.095, 0.2125, 0.264, { slant: true }),
      panel('p4', 0.535, 0.371, 0.2125, 0.264, { slant: true }),
      panel('p5', 0.7595, 0.371, 0.2125, 0.264, { slant: true }),
    ],
  },
  {
    id: 'nine-panel',
    name: '9-Panel',
    blurb: 'Official-cover style grid',
    panels: [
      panel('p1', 0.028, 0.095, 0.305, 0.172),
      panel('hero', 0.345, 0.095, 0.305, 0.172, { hero: true }),
      panel('p3', 0.662, 0.095, 0.31, 0.172),
      panel('p4', 0.028, 0.279, 0.305, 0.172),
      panel('p5', 0.345, 0.279, 0.305, 0.172),
      panel('p6', 0.662, 0.279, 0.31, 0.172),
      panel('p7', 0.028, 0.463, 0.305, 0.172),
      panel('p8', 0.345, 0.463, 0.305, 0.172),
      panel('p9', 0.662, 0.463, 0.31, 0.172),
    ],
  },
  {
    id: 'duo',
    name: 'Duo',
    blurb: 'Two leads, three below',
    panels: [
      panel('hero', 0.028, 0.095, 0.6, 0.405, { hero: true }),
      panel('p2', 0.64, 0.095, 0.332, 0.405),
      panel('p3', 0.028, 0.512, 0.305, 0.123),
      panel('p4', 0.345, 0.512, 0.305, 0.123),
      panel('p5', 0.662, 0.512, 0.31, 0.123),
    ],
  },
];

export const DEFAULT_LAYOUT_ID = 'popout';

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// Pixel rects for a layout at poster size W x H.
// The pop-out hero overflows the grid's left and bottom edges (fractions of
// W / H) but always stays inside the poster itself.
export function layoutPixelRects(layoutId, W, H) {
  const layout = layoutById(layoutId);
  return layout.panels.map((p) => {
    let x = p.x * W;
    let y = p.y * H;
    let w = p.w * W;
    let h = p.h * H;
    if (p.popout) {
      const overL = 0.02 * W;
      const overB = 0.016 * H;
      x = Math.max(2, x - overL);
      w = w + (p.x * W - x);
      h = h + overB;
    }
    return { ...p, px: x, py: y, pw: w, ph: h };
  });
}

export function heroPanel(layoutId) {
  return layoutById(layoutId).panels.find((p) => p.hero);
}

// The hero's face zone in poster pixels: the upper third of the hero panel,
// where the face-aware crop always lands the face. The title block must stay
// below this box in every layout and every size.
export function heroFaceBox(layoutId, W, H) {
  const rects = layoutPixelRects(layoutId, W, H);
  const hero = rects.find((r) => r.hero);
  return {
    x: hero.px + hero.pw * 0.3,
    y: hero.py + hero.ph * 0.06,
    w: hero.pw * 0.4,
    h: hero.ph * 0.3,
  };
}

export { GAP };
