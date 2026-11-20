// grades.js — the five colour grades for Palm Heat Cover Studio.
// Each grade is a complete look: ink colour, a 5-tone poster palette
// (dark -> light), halftone density, edge threshold, title gradient,
// sky gradient and glow. Pure data + helpers; no DOM, testable in Node.

export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    ink: [12, 6, 18],
    // dark -> light poster tones: deep purple, magenta, hot coral, amber, pale gold
    tones: [[24, 8, 42], [96, 22, 74], [198, 62, 92], [255, 138, 58], [255, 228, 158]],
    halftone: 0.55,
    edgeThreshold: 0.16,
    titleFrom: '#ffffff',
    titleTo: '#ffd75e',
    subtitle: '#ff7ad9',
    sky: ['#2a0a4a', '#c73e6e', '#ff8a3c'],
    glow: '#ff5e8a',
    shadowLift: 0.19,
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    ink: [6, 6, 20],
    tones: [[8, 8, 30], [34, 22, 88], [122, 42, 168], [224, 62, 182], [130, 240, 255]],
    halftone: 0.7,
    edgeThreshold: 0.14,
    titleFrom: '#ffffff',
    titleTo: '#7df3ff',
    subtitle: '#ff5ec4',
    sky: ['#050514', '#1c0f4e', '#7a1e8f'],
    glow: '#37e6ff',
    shadowLift: 0.14,
  },
  {
    id: 'golden-coast',
    name: 'Golden Coast',
    ink: [20, 14, 6],
    tones: [[22, 30, 20], [64, 92, 58], [198, 158, 62], [255, 208, 110], [255, 244, 218]],
    halftone: 0.45,
    edgeThreshold: 0.17,
    titleFrom: '#ffffff',
    titleTo: '#ffb52e',
    subtitle: '#2ec4b6',
    sky: ['#123524', '#c98a2e', '#ffd97a'],
    glow: '#ffc53c',
    shadowLift: 0.18,
  },
  {
    id: 'noir-ink',
    name: 'Noir Ink',
    ink: [0, 0, 0],
    tones: [[12, 12, 12], [52, 52, 54], [112, 112, 116], [182, 182, 186], [246, 246, 240]],
    halftone: 0.8,
    edgeThreshold: 0.13,
    titleFrom: '#ffffff',
    titleTo: '#d8d8d8',
    subtitle: '#ff3b30',
    sky: ['#000000', '#2b2b2e', '#8a8a8e'],
    glow: '#ff3b30',
    shadowLift: 0.2,
  },
  {
    id: 'teal-pink',
    name: 'Teal Pink',
    ink: [8, 18, 24],
    tones: [[10, 26, 36], [22, 92, 102], [62, 162, 172], [255, 112, 172], [255, 222, 232]],
    halftone: 0.6,
    edgeThreshold: 0.15,
    titleFrom: '#ffffff',
    titleTo: '#ff9ecf',
    subtitle: '#37e6c8',
    sky: ['#062a33', '#0f7d8c', '#ff7ab8'],
    glow: '#ff6fb1',
    shadowLift: 0.16,
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Map a lifted luminance 0..1 onto the grade's 5-tone palette.
// Returns [r, g, b]; the fractional position inside a band blends
// toward the next tone so the poster keeps smooth modelling.
export function toneFor(grade, lum) {
  const t = grade.tones;
  const x = Math.max(0, Math.min(0.999999, lum)) * (t.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = t[i];
  const b = t[Math.min(t.length - 1, i + 1)];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

// Lift the darkest values so no panel ever reads as a black hole:
// lum' = lift + (1 - lift) * lum. The lift is grade-specific.
export function liftShadow(grade, lum) {
  const l = grade.shadowLift;
  return l + (1 - l) * lum;
}
