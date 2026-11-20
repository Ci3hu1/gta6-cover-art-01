// layouts.js — six cover layouts, pure geometry (no DOM, Node-testable).
// Every layout returns panels as pixel rects in a W x H cover, plus which
// panel is the hero. The hero is drawn POPPED OUT of its cell (see cover.js:
// expanded ~24px, soft edge, drop shadow, white keyline) so it stands proud
// of the grid like Billboard Bay / Neon Harbor.
//
// Panel tags are cast role tags drawn on the panels (LUCIA, JASON, ...).
// `photo` is an index into the state's photo list; the default cover preset
// assigns 5 DIFFERENT photos, one per panel.

export const LAYOUTS = [
  { id: 'hero-led', name: 'Hero Led' },
  { id: 'grid', name: 'Classic Grid' },
  { id: 'portrait', name: 'Portrait' },
  { id: 'wide', name: 'Wide Hero' },
  { id: 'slanted', name: 'Slanted' },
  { id: 'nine', name: 'Nine Panel' },
];

const GAP = 10; // px gap between panels, scaled by cover size in layoutPanels

// Face-aware crop anchor: the hero crop is anchored on the upper third of
// the photo (focusY ~0.22) so head + shoulders stay fully in frame.
export const HERO_FOCUS = { x: 0.5, y: 0.22 };
export const PANEL_FOCUS = { x: 0.5, y: 0.45 };

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// rect helper: fractions of W/H -> pixels.
function r(W, H, fx, fy, fw, fh) {
  return { x: fx * W, y: fy * H, w: fw * W, h: fh * H };
}

export function layoutPanels(id, W, H) {
  const g = Math.max(6, Math.round(Math.min(W, H) * 0.008)); // panel gap
  switch (id) {
    case 'grid': {
      // 3 x 2 grid; hero is the top-left double-wide panel.
      const cw = (W - 2 * g) / 3, ch = (H - g) / 2;
      return [
        { ...r(W, H, 0, 0, 2 / 3, 0.5), hero: true, tag: 'LUCIA', slant: 0, photo: 0 },
        { x: 2 * cw + 2 * g, y: 0, w: cw, h: ch, hero: false, tag: 'JASON', slant: 0, photo: 1 },
        { x: 0, y: ch + g, w: cw, h: ch, hero: false, tag: 'OCEAN DR', slant: 0, photo: 2 },
        { x: cw + g, y: ch + g, w: cw, h: ch, hero: false, tag: 'VICE CITY', slant: 0, photo: 3 },
        { x: 2 * cw + 2 * g, y: ch + g, w: cw, h: ch, hero: false, tag: 'LEONIDA', slant: 0, photo: 4 },
      ];
    }
    case 'portrait': {
      // Hero across the top, 2 x 2 below. Built for the 1080x1350 size.
      const cw = (W - g) / 2, ch = (H * 0.42 - 2 * g) / 2;
      const hy = H * 0.58;
      return [
        { x: 0, y: 0, w: W, h: hy, hero: true, tag: 'LUCIA', slant: 0, photo: 0 },
        { x: 0, y: hy + g, w: cw, h: ch, hero: false, tag: 'JASON', slant: 0, photo: 1 },
        { x: cw + g, y: hy + g, w: cw, h: ch, hero: false, tag: 'NEON', slant: 0, photo: 2 },
        { x: 0, y: hy + g + ch + g, w: cw, h: ch, hero: false, tag: 'OCEAN DR', slant: 0, photo: 3 },
        { x: cw + g, y: hy + g + ch + g, w: cw, h: ch, hero: false, tag: 'LEONIDA', slant: 0, photo: 4 },
      ];
    }
    case 'wide': {
      // Hero dead centre, popped out over a 4-panel strip behind it.
      const sw = (W - 3 * g) / 4, sh = H;
      const hw = W * 0.46, hh = H * 0.86, hx = (W - hw) / 2, hy = (H - hh) / 2;
      return [
        { x: hx, y: hy, w: hw, h: hh, hero: true, tag: 'LUCIA', slant: 0, photo: 0 },
        { x: 0, y: 0, w: sw, h: sh, hero: false, tag: 'JASON', slant: 0, photo: 1 },
        { x: sw + g, y: 0, w: sw, h: sh, hero: false, tag: 'NEON', slant: 0, photo: 2 },
        { x: 2 * sw + 2 * g, y: 0, w: sw, h: sh, hero: false, tag: 'OCEAN DR', slant: 0, photo: 3 },
        { x: 3 * sw + 3 * g, y: 0, w: sw, h: sh, hero: false, tag: 'LEONIDA', slant: 0, photo: 4 },
      ];
    }
    case 'slanted': {
      // Five slanted panels (parallelogram clips), hero in the middle, widest.
      const n = 5, cw = (W - (n - 1) * g) / n;
      const tags = ['JASON', 'LUCIA', 'NEON', 'OCEAN DR', 'LEONIDA'];
      const out = [];
      for (let i = 0; i < n; i++) {
        const hero = i === 2;
        out.push({
          x: i * (cw + g), y: hero ? 0 : H * 0.06, w: cw, h: hero ? H : H * 0.88,
          hero, tag: tags[i], slant: 0.06, photo: i,
        });
      }
      return out;
    }
    case 'nine': {
      // Official-cover style: 3 x 3 collage, hero is the centre panel.
      const cw = (W - 2 * g) / 3, ch = (H - 2 * g) / 3;
      const tags = ['JASON', 'LUCIA', 'NEON', 'OCEAN DR', 'VICE CITY', 'LEONIDA', 'PALMS', 'STRIP', 'HEAT'];
      const out = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const i = row * 3 + col;
          out.push({
            x: col * (cw + g), y: row * (ch + g), w: cw, h: ch,
            hero: i === 4, tag: tags[i], slant: 0, photo: i % 6,
          });
        }
      }
      return out;
    }
    case 'hero-led':
    default: {
      // Default: big hero left, 2 x 2 stack right. Five different photos.
      return heroLedPanels(W, H);
    }
  }
}

// The hero-led default: big hero left, 2 x 2 stack right, five panels,
// five different photos. Canonical geometry used by the cover shot.
export function heroLedPanels(W, H) {
  const g = Math.max(6, Math.round(Math.min(W, H) * 0.008));
  const rx = W * 0.58 + g;
  const rw = W - rx;
  const rh = (H - g) / 2;
  const cw = (rw - g) / 2;
  return [
    { x: 0, y: 0, w: W * 0.58, h: H, hero: true, tag: 'LUCIA', slant: 0, photo: 0 },
    { x: rx, y: 0, w: cw, h: rh, hero: false, tag: 'JASON', slant: 0, photo: 1 },
    { x: rx + cw + g, y: 0, w: cw, h: rh, hero: false, tag: 'NEON', slant: 0, photo: 2 },
    { x: rx, y: rh + g, w: cw, h: rh, hero: false, tag: 'OCEAN DR', slant: 0, photo: 3 },
    { x: rx + cw + g, y: rh + g, w: cw, h: rh, hero: false, tag: 'LEONIDA', slant: 0, photo: 4 },
  ];
}

// Cover-fit source rect: crop `img` (iw x ih) to fill (w x h) anchored on a
// focus point (0..1), with an optional zoom. Never crops through a face when
// the focus point sits on it — the hero uses focusY 0.22 (upper third).
export function coverFitRect(iw, ih, w, h, focusX, focusY, zoom = 1) {
  const scale = Math.max(w / iw, h / ih) * zoom;
  const sw = w / scale, sh = h / scale;
  let sx = (iw - sw) * focusX;
  let sy = (ih - sh) * focusY;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  return { sx, sy, sw, sh };
}

// Title block geometry, computed BOTTOM-UP so the 5 stars can never be cut
// off: stars sit on a row whose bottom edge is `bottomMargin` px above the
// frame edge (>= 36px clear space, the carried star fix). Title sits above
// the stars, subtitle above the title. Returns pixel geometry for W x H.
export function titleBlockGeometry(W, H) {
  const starSize = Math.max(18, Math.round(Math.min(W, H) * 0.026));
  const bottomMargin = Math.max(40, Math.round(H * 0.045)); // >= 36px clear
  const starsY = H - bottomMargin - starSize;
  const gap = Math.round(starSize * 0.5);
  const titleSize = Math.round(Math.min(W, H) * 0.115);
  const titleY = starsY - gap - titleSize * 0.95; // baseline of title
  const subSize = Math.round(Math.min(W, H) * 0.038);
  const subY = titleY - titleSize * 1.02; // subtitle sits ABOVE the title's top, never inside it
  return {
    starSize, bottomMargin, starsY, starsBottom: starsY + starSize,
    clearBelow: H - (starsY + starSize),
    titleSize, titleY, subSize, subY,
    scrimTop: subY - subSize * 2.2,
  };
}

// Fit the title font size so `text` fits inside maxWidth at Anton.
export function fitTitleSize(ctx, text, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}
