// Colour grades — five truly distinct palettes, each five tones light -> dark,
// with its own ink colour, halftone density and glow. The grade is applied
// AFTER the ink pipeline, mapping the five posterize tones onto the palette,
// so the same inked photo reads completely differently per grade.

export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    palette: ['#FFE8C2', '#FFB36B', '#FF6B4A', '#C22769', '#2A0E2E'],
    ink: '#1A0B1E',
    halftoneCell: 6,
    halftoneMax: 0.85,
    glow: 'rgba(255, 107, 74, 0.55)',
  },
  {
    id: 'neon',
    name: 'Neon Night',
    palette: ['#C9F7F2', '#3ED6C5', '#7A5CFF', '#FF2E88', '#0D0A1A'],
    ink: '#0A0616',
    halftoneCell: 5,
    halftoneMax: 0.9,
    glow: 'rgba(122, 92, 255, 0.55)',
  },
  {
    id: 'gold',
    name: 'Golden Coast',
    palette: ['#FFF3C4', '#FFC94D', '#F08A1D', '#B33A1F', '#2A1408'],
    ink: '#201005',
    halftoneCell: 7,
    halftoneMax: 0.8,
    glow: 'rgba(255, 201, 77, 0.5)',
  },
  {
    id: 'noir',
    name: 'Noir Ink',
    palette: ['#F5F2EA', '#C9C4B8', '#8A8578', '#4A463E', '#14120E'],
    ink: '#0C0A08',
    halftoneCell: 5,
    halftoneMax: 0.9,
    glow: 'rgba(245, 242, 234, 0.35)',
  },
  {
    id: 'teal',
    name: 'Teal Pink',
    palette: ['#FFD9E8', '#FF8FB8', '#2EC4B6', '#0E6E6A', '#2B0A2E'],
    ink: '#1C0A24',
    halftoneCell: 6,
    halftoneMax: 0.85,
    glow: 'rgba(46, 196, 182, 0.5)',
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

/** True when every grade has 5 tones and no two palettes are identical. */
export function gradesAreDistinct() {
  if (GRADES.length !== 5) return false;
  const seen = new Set();
  for (const g of GRADES) {
    if (!Array.isArray(g.palette) || g.palette.length !== 5) return false;
    const key = g.palette.join('|');
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}
