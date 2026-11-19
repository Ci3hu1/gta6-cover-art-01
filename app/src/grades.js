// Palm Heat Cover Studio — grades.js
// Five truly distinct colour grades. Each grade is a 5-step poster palette
// (dark -> light) plus an ink colour, a glow colour, a halftone density and a
// shadow lift. The ink pipeline in cover.js maps every pixel's posterized
// tone to one step of the palette, so swapping a grade re-inks the whole
// poster instead of tinting it like a photo filter.

export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    ink: '#160709',
    // dark, deep, mid, bright, paper
    palette: ['#2b0a1e', '#7a1e3c', '#e8533f', '#ff9e57', '#ffe9b0'],
    glow: '#ff5e3a',
    halftone: 1.0,
    shadowLift: 0.0,
    grain: 9,
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    ink: '#05030f',
    palette: ['#0b0630', '#3b1d8f', '#b13df0', '#ff5ad1', '#7df9ff'],
    glow: '#ff2fb3',
    halftone: 1.15,
    shadowLift: 0.06,
    grain: 10,
  },
  {
    id: 'golden-coast',
    name: 'Golden Coast',
    ink: '#1c1206',
    palette: ['#3a2408', '#8a5a1d', '#e8a83c', '#ffd97a', '#fff6d8'],
    glow: '#ffb52e',
    halftone: 0.9,
    shadowLift: 0.04,
    grain: 8,
  },
  {
    id: 'noir-ink',
    name: 'Noir Ink',
    ink: '#000000',
    palette: ['#141414', '#3a3a3a', '#7d7d7d', '#c9c9c9', '#ffffff'],
    glow: '#ffffff',
    halftone: 1.3,
    shadowLift: 0.1,
    grain: 12,
  },
  {
    id: 'teal-pink',
    name: 'Teal Pink',
    ink: '#0a0f14',
    palette: ['#0d2b33', '#14655e', '#2fb3a3', '#ff7fa5', '#ffe3ec'],
    glow: '#2fe8c8',
    halftone: 1.0,
    shadowLift: 0.05,
    grain: 9,
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

export function gradeIds() {
  return GRADES.map((g) => g.id);
}

// Map a 0..255 luminance to a 0..4 poster tone. `lift` (0..0.25) raises the
// darkest band so a dark photo still reads at a glance (v2.1 fix: the dark
// panel). The lift is strongest in the shadows and fades toward white.
export function posterizeTone(lum, lift = 0) {
  const t = lift + (1 - lift) * (lum / 255);
  if (t < 0.16) return 0;
  if (t < 0.36) return 1;
  if (t < 0.56) return 2;
  if (t < 0.78) return 3;
  return 4;
}

// Perceived luminance (Rec. 709 weights), 0..255.
export function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// 4x4 Bayer matrix for the halftone dot screen in shadow areas.
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Halftone decision: in the two darkest tones, punch the pixel one step
// lighter wherever the Bayer cell is "open", which reads as printed dots.
// `density` scales how much of the shadow turns to dots.
export function halftoneLightens(tone, x, y, density = 1) {
  if (tone > 1) return false;
  const cell = BAYER[y & 3][x & 3] / 16;
  const threshold = tone === 0 ? 0.45 * density : 0.7 * density;
  return cell > threshold;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
