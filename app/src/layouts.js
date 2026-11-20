// layouts.js — panel geometry and title-block geometry for Palm Heat Cover Studio.
// All rects are fractions of the cover (0..1) so one layout works at every
// export size (1080x1080, 1080x1350, 1920x1080). Pure data + math, no DOM.
//
// Framing rules baked into the defaults (v2.1 fixes):
// - Hero focus sits in the UPPER part of its photo (focus.y ~0.30) so a face
//   near the top of the frame is never cropped through.
// - The skyline panel crops deep into the LOWER, busy part of its photo
//   (focus.y ~0.78, zoom ~1.7) — the photo is mostly empty sky above the
//   horizon, so a shallow crop reads as an empty gradient.
// - The title block is laid out BOTTOM-UP from the cover's bottom edge with
//   an explicit bottom margin, so the 5 heat stars always sit fully inside
//   the frame with clear space below them (the v2.1 fix-rebuild fix).

export const SAMPLES = [
  { id: 'boulevard', file: 'samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'pier', file: 'samples/pier.jpg', label: 'Pier' },
  { id: 'car', file: 'samples/car.jpg', label: 'Vice Car' },
  { id: 'skyline', file: 'samples/skyline.jpg', label: 'Skyline' },
  { id: 'crowd', file: 'samples/crowd.jpg', label: 'Beach Crowd' },
  { id: 'neon', file: 'samples/neonstreet.jpg', label: 'Neon Street' },
];

// NOTE: the neon sample file on disk is samples/neon.jpg (picsum seed
// "neonstreet"). The id above keeps the seed name; file is resolved by
// sampleFile() below.
export function sampleFile(id) {
  if (id === 'neon') return 'samples/neon.jpg';
  const s = SAMPLES.find((x) => x.id === id);
  return s ? s.file : 'samples/boulevard.jpg';
}

// panel: { x, y, w, h (fractions), photo (sample id), fx, fy (focus 0..1),
//          zoom, tilt (degrees, 0 = straight) }
export const LAYOUTS = {
  hero: {
    id: 'hero',
    name: 'Hero-led',
    panels: [
      { x: 0, y: 0, w: 0.6, h: 0.64, photo: 'boulevard', fx: 0.5, fy: 0.3, zoom: 1.05, tilt: 0 },
      { x: 0.6, y: 0, w: 0.4, h: 0.32, photo: 'skyline', fx: 0.5, fy: 0.78, zoom: 1.7, tilt: 0 },
      { x: 0.6, y: 0.32, w: 0.4, h: 0.32, photo: 'crowd', fx: 0.5, fy: 0.4, zoom: 1.05, tilt: 0 },
      { x: 0, y: 0.64, w: 0.5, h: 0.36, photo: 'car', fx: 0.5, fy: 0.5, zoom: 1.05, tilt: 0 },
      { x: 0.5, y: 0.64, w: 0.5, h: 0.36, photo: 'pier', fx: 0.5, fy: 0.35, zoom: 1.05, tilt: 0 },
    ],
  },
  classic: {
    id: 'classic',
    name: 'Classic Grid',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.34, photo: 'boulevard', fx: 0.5, fy: 0.3, zoom: 1.05, tilt: 0 },
      { x: 0.5, y: 0, w: 0.5, h: 0.34, photo: 'skyline', fx: 0.5, fy: 0.78, zoom: 1.7, tilt: 0 },
      { x: 0, y: 0.34, w: 0.5, h: 0.33, photo: 'neon', fx: 0.5, fy: 0.45, zoom: 1.05, tilt: 0 },
      { x: 0.5, y: 0.34, w: 0.5, h: 0.33, photo: 'crowd', fx: 0.5, fy: 0.4, zoom: 1.05, tilt: 0 },
      { x: 0, y: 0.67, w: 0.5, h: 0.33, photo: 'car', fx: 0.5, fy: 0.5, zoom: 1.05, tilt: 0 },
      { x: 0.5, y: 0.67, w: 0.5, h: 0.33, photo: 'pier', fx: 0.5, fy: 0.35, zoom: 1.05, tilt: 0 },
    ],
  },
  portrait: {
    id: 'portrait',
    name: 'Portrait',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.4, photo: 'boulevard', fx: 0.5, fy: 0.3, zoom: 1.05, tilt: 0 },
      { x: 0, y: 0.4, w: 0.5, h: 0.28, photo: 'neon', fx: 0.5, fy: 0.45, zoom: 1.05, tilt: 0 },
      { x: 0.5, y: 0.4, w: 0.5, h: 0.28, photo: 'crowd', fx: 0.5, fy: 0.4, zoom: 1.05, tilt: 0 },
      { x: 0, y: 0.68, w: 0.5, h: 0.32, photo: 'skyline', fx: 0.5, fy: 0.78, zoom: 1.7, tilt: 0 },
      { x: 0.5, y: 0.68, w: 0.5, h: 0.32, photo: 'pier', fx: 0.5, fy: 0.35, zoom: 1.05, tilt: 0 },
    ],
  },
  wide: {
    id: 'wide',
    name: 'Wide',
    panels: [
      { x: 0, y: 0, w: 0.45, h: 1, photo: 'boulevard', fx: 0.5, fy: 0.3, zoom: 1.05, tilt: 0 },
      { x: 0.45, y: 0, w: 0.275, h: 0.5, photo: 'skyline', fx: 0.5, fy: 0.78, zoom: 1.7, tilt: 0 },
      { x: 0.725, y: 0, w: 0.275, h: 0.5, photo: 'neon', fx: 0.5, fy: 0.45, zoom: 1.05, tilt: 0 },
      { x: 0.45, y: 0.5, w: 0.275, h: 0.5, photo: 'crowd', fx: 0.5, fy: 0.4, zoom: 1.05, tilt: 0 },
      { x: 0.725, y: 0.5, w: 0.275, h: 0.5, photo: 'pier', fx: 0.5, fy: 0.35, zoom: 1.05, tilt: 0 },
    ],
  },
  tilted: {
    id: 'tilted',
    name: 'Tilted Snapshots',
    panels: [
      { x: 0.02, y: 0.01, w: 0.58, h: 0.62, photo: 'boulevard', fx: 0.5, fy: 0.3, zoom: 1.08, tilt: -2 },
      { x: 0.6, y: 0.02, w: 0.38, h: 0.3, photo: 'skyline', fx: 0.5, fy: 0.78, zoom: 1.7, tilt: 2 },
      { x: 0.6, y: 0.33, w: 0.38, h: 0.31, photo: 'crowd', fx: 0.5, fy: 0.4, zoom: 1.08, tilt: -1.5 },
      { x: 0.01, y: 0.64, w: 0.49, h: 0.35, photo: 'car', fx: 0.5, fy: 0.5, zoom: 1.08, tilt: 1.5 },
      { x: 0.51, y: 0.65, w: 0.48, h: 0.34, photo: 'pier', fx: 0.5, fy: 0.35, zoom: 1.08, tilt: -2 },
    ],
  },
};

export function layoutById(id) {
  return LAYOUTS[id] || LAYOUTS.hero;
}

// Panel rects in pixels for a cover of W x H. Widths/heights are clamped
// so fractional rounding can never push a panel 1px past the frame edge.
export function panelRects(layoutId, W, H) {
  const layout = layoutById(layoutId);
  return layout.panels.map((p) => {
    const x = Math.round(p.x * W);
    const y = Math.round(p.y * H);
    return {
      x,
      y,
      w: Math.min(Math.round(p.w * W), W - x),
      h: Math.min(Math.round(p.h * H), H - y),
      photo: p.photo,
      fx: p.fx,
      fy: p.fy,
      zoom: p.zoom,
      tilt: p.tilt,
    };
  });
}

// Title-block geometry, laid out BOTTOM-UP so nothing can be cut off:
// the stars sit at a fixed bottom margin above the frame edge, the
// subtitle sits above the stars, the title above the subtitle.
// Returns pixel positions; starsBottom is always H - bottomMargin.
export function titleBlock(W, H) {
  const min = Math.min(W, H);
  const bottomMargin = Math.max(36, Math.round(H * 0.045));
  const starR = Math.max(12, Math.round(min * 0.026));
  const starGap = Math.round(starR * 1.7);
  const starsCy = H - bottomMargin - starR;
  const subtitleSize = Math.round(min * 0.036);
  const subtitleBaseline = starsCy - starR - Math.round(min * 0.012) - 4;
  const titleSize = Math.round(min * 0.115);
  const titleBaseline = subtitleBaseline - subtitleSize - Math.round(min * 0.018);
  const scrimTop = titleBaseline - titleSize * 1.05;
  return {
    bottomMargin,
    starR,
    starGap,
    starsCy,
    starsBottom: starsCy + starR,
    subtitleSize,
    subtitleBaseline,
    titleSize,
    titleBaseline,
    scrimTop,
  };
}

// The 5 heat-meter stars, centred horizontally.
export function starCenters(W, H) {
  const tb = titleBlock(W, H);
  const spacing = tb.starR * 2.6;
  const centers = [];
  for (let i = 0; i < 5; i++) {
    centers.push({ x: W / 2 + (i - 2) * spacing, y: tb.starsCy, r: tb.starR });
  }
  return centers;
}
