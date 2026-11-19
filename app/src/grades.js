// Five truly distinct colour grades for Palm Heat Cover Studio.
// Each grade drives the comic-ink pipeline: its ink colour, its 5-tone
// posterize palette (dark -> light), its halftone density and its glow.
// Pure data + tiny lookups — no DOM, so Node tests can import this file.

export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    ink: [26, 11, 46],
    // deep plum -> magenta -> orange-red -> amber -> pale gold
    palette: [[43, 15, 63], [123, 45, 94], [226, 80, 62], [255, 154, 61], [255, 233, 168]],
    halftone: 0.5,
    glow: { color: [255, 140, 40], strength: 0.35 },
    paper: [24, 10, 18],
    titleGradient: ['#ffffff', '#ffd76a'],
    subtitle: '#7df9ff',
    badge: '#ff2e63',
  },
  {
    id: 'neon',
    name: 'Neon Night',
    ink: [5, 5, 16],
    // midnight -> indigo -> violet -> hot pink -> ice cyan
    palette: [[10, 10, 36], [27, 42, 107], [123, 47, 247], [255, 46, 136], [125, 249, 255]],
    halftone: 0.7,
    glow: { color: [255, 46, 136], strength: 0.55 },
    paper: [6, 6, 18],
    titleGradient: ['#ffffff', '#ff9de2'],
    subtitle: '#7df9ff',
    badge: '#ff2e88',
  },
  {
    id: 'gold',
    name: 'Golden Coast',
    ink: [32, 20, 9],
    // espresso -> bronze -> ochre -> gold -> cream
    palette: [[58, 36, 8], [138, 90, 29], [217, 154, 43], [247, 201, 72], [255, 243, 196]],
    halftone: 0.35,
    glow: { color: [247, 201, 72], strength: 0.4 },
    paper: [26, 18, 8],
    titleGradient: ['#fffbe8', '#f7c948'],
    subtitle: '#ff8a3d',
    badge: '#d99a2b',
  },
  {
    id: 'noir',
    name: 'Noir Ink',
    ink: [0, 0, 0],
    // pure greyscale: the ink-and-paper grade
    palette: [[17, 17, 17], [58, 58, 58], [110, 110, 110], [168, 168, 168], [242, 242, 242]],
    halftone: 0.85,
    glow: { color: [255, 255, 255], strength: 0.0 },
    paper: [12, 12, 12],
    titleGradient: ['#ffffff', '#d9d9d9'],
    subtitle: '#e5e5e5',
    badge: '#111111',
  },
  {
    id: 'teal',
    name: 'Teal Pink',
    ink: [13, 27, 42],
    // deep teal -> teal -> rose -> pink -> blush
    palette: [[18, 51, 50], [15, 118, 110], [244, 114, 182], [251, 113, 133], [253, 242, 248]],
    halftone: 0.5,
    glow: { color: [244, 114, 182], strength: 0.45 },
    paper: [8, 24, 30],
    titleGradient: ['#ffffff', '#f9a8d4'],
    subtitle: '#5eead4',
    badge: '#f472b6',
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Map a posterized tone (0..4, dark -> light) to the grade's palette colour.
export function gradeColor(grade, tone) {
  const t = Math.max(0, Math.min(4, tone | 0));
  return grade.palette[t];
}

// Are two palettes distinct? Used by tests: every grade must read differently.
export function palettesDistinct(a, b) {
  let d = 0;
  for (let i = 0; i < 5; i++) {
    for (let c = 0; c < 3; c++) d += Math.abs(a.palette[i][c] - b.palette[i][c]);
  }
  return d > 200;
}
