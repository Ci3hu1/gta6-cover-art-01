// grades.js — the five colour grades for Palm Heat Cover Studio.
// A grade sets the ink colour, the 5-tone poster palette (dark -> light),
// the halftone dot spacing and the glow colour used for the neon subtitle.
// Pure data + pure helpers: no browser globals, unit-tested in tests/.

export const GRADES = {
  vice: {
    id: 'vice',
    name: 'Vice Sunset',
    ink: '#160a24',
    // dark -> light, 5 poster tones
    palette: ['#1d0b2e', '#5b1a4d', '#c93a6b', '#ff7a3c', '#ffd166'],
    halftone: 6,
    glow: '#ff9e57',
    shadowFloor: 0.16,
  },
  neon: {
    id: 'neon',
    name: 'Neon Night',
    ink: '#050514',
    palette: ['#050514', '#1b1b4d', '#7b2ff7', '#ff2e88', '#7df9ff'],
    halftone: 5,
    glow: '#ff2e88',
    shadowFloor: 0.12,
  },
  golden: {
    id: 'golden',
    name: 'Golden Coast',
    ink: '#201404',
    palette: ['#201404', '#6b3d0c', '#c97b1e', '#ffb347', '#fff3c4'],
    halftone: 7,
    glow: '#ffcf6e',
    shadowFloor: 0.16,
  },
  noir: {
    id: 'noir',
    name: 'Noir Ink',
    ink: '#000000',
    palette: ['#000000', '#1c1c1c', '#4a4a4a', '#8a8a8a', '#f2f2f2'],
    halftone: 4,
    glow: '#ffffff',
    shadowFloor: 0.2,
  },
  teal: {
    id: 'teal',
    name: 'Teal Pink',
    ink: '#062a2a',
    palette: ['#062a2a', '#0e4d4d', '#14919b', '#ff6b9d', '#ffe3ec'],
    halftone: 6,
    glow: '#ff6b9d',
    shadowFloor: 0.14,
  },
};

export const GRADE_IDS = Object.keys(GRADES);

/** Look a grade up by id; unknown ids fall back to Vice Sunset. */
export function gradeById(id) {
  return GRADES[id] || GRADES.vice;
}

/** Parse a #rrggbb colour into [r, g, b] (0-255). */
export function hexRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Map a 0..1 luminance through a grade's 5-tone palette.
 * Returns [r, g, b]. The palette is a gradient map: the tone is looked up
 * continuously so band edges stay soft inside the posterized steps.
 */
export function gradeColor(grade, lum) {
  const pal = grade.palette.map(hexRgb);
  const t = Math.max(0, Math.min(1, lum)) * (pal.length - 1);
  const i = Math.min(pal.length - 2, Math.floor(t));
  const f = t - i;
  const a = pal[i];
  const b = pal[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/** Mean luminance (0..1) of an {width, height, data} RGBA image. */
export function meanLuminance(img) {
  const d = img.data;
  let sum = 0;
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    sum += 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
  }
  return sum / n / 255;
}

/**
 * Shadow lift for dark photos (v2.1 fix: the camera panel came out nearly
 * black). Returns the darkest posterize band floor to use: dark photos get
 * a higher floor so shadow detail survives the ink pass.
 */
export function shadowFloorFor(grade, meanLum) {
  if (meanLum < 0.22) return Math.max(grade.shadowFloor, 0.28);
  if (meanLum < 0.35) return Math.max(grade.shadowFloor, 0.22);
  return grade.shadowFloor;
}
