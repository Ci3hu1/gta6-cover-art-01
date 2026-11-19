// Panel geometry for the five cover layouts. Every layout returns panels as
// {x, y, w, h, rot} in cover pixels, plus a titleBand height fraction.
// The layouts are the app's own poster designs: a four-panel grid, a hero with
// three below, a single full-bleed photo, a nine-panel grid, and tilted snapshots.
export const LAYOUTS = {
  grid4: { label: 'Four-Panel Grid', panels: 4 },
  hero3: { label: 'Hero + Three', panels: 4 },
  fullbleed: { label: 'Full Bleed', panels: 1 },
  grid9: { label: 'Nine-Panel Grid', panels: 9 },
  tilted: { label: 'Tilted Snapshots', panels: 3 },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

export const SIZES = {
  '1080x1080': { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  '1080x1350': { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  '1920x1080': { label: 'Landscape 1920 x 1080', w: 1920, h: 1080 },
};

export const SIZE_IDS = Object.keys(SIZES);

/** Panel rectangles for a layout inside a W x H cover. `gap` is the inked gutter. */
export function layoutPanels(layout, W, H) {
  const gap = Math.max(4, Math.round(Math.min(W, H) * 0.012));
  const band = Math.round(H * 0.24); // title band reserved at the foot
  const top = 0;
  const bottom = H - band;
  const innerH = bottom - top;
  const P = (x, y, w, h, rot = 0) => ({ x, y, w, h, rot });
  switch (layout) {
    case 'grid4': {
      const cw = (W - gap * 3) / 2;
      const ch = (innerH - gap * 3) / 2;
      return [
        P(gap, gap, cw, ch), P(gap * 2 + cw, gap, cw, ch),
        P(gap, gap * 2 + ch, cw, ch), P(gap * 2 + cw, gap * 2 + ch, cw, ch),
      ];
    }
    case 'hero3': {
      const heroH = Math.round(innerH * 0.6);
      const rowH = innerH - heroH - gap * 2;
      const cw = (W - gap * 4) / 3;
      return [
        P(gap, gap, W - gap * 2, heroH),
        P(gap, heroH + gap * 2, cw, rowH),
        P(gap * 2 + cw, heroH + gap * 2, cw, rowH),
        P(gap * 3 + cw * 2, heroH + gap * 2, cw, rowH),
      ];
    }
    case 'fullbleed':
      return [P(0, 0, W, H)];
    case 'grid9': {
      const cw = (W - gap * 4) / 3;
      const ch = (innerH - gap * 4) / 3;
      const out = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) out.push(P(gap + c * (cw + gap), gap + r * (ch + gap), cw, ch));
      }
      return out;
    }
    case 'tilted': {
      const pw = Math.round(W * 0.34);
      const ph = Math.round(innerH * 0.82);
      const y = Math.round((innerH - ph) / 2);
      return [
        P(Math.round(W * 0.06), y, pw, ph, -0.09),
        P(Math.round(W * 0.33), y - 8, pw, ph, 0.03),
        P(Math.round(W * 0.60), y, pw, ph, 0.10),
      ];
    }
    default:
      return layoutPanels('grid4', W, H);
  }
}

/** Height of the title band at the foot of the cover, in pixels. */
export function titleBandHeight(H) {
  return Math.round(H * 0.24);
}
