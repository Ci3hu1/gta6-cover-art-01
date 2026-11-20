// Leonida Nights Cover Studio v4 — colour grades.
// One disciplined golden-hour family: every grade is a warm sunset variant
// (warmth / tint / glow / vignette only). No posterize, no halftone, no ink
// on faces by default — the painterly "Poster Ink" look is a separate,
// opt-in toggle applied on top (see cover.js).

export const GRADES = [
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    warmth: 1.0,
    saturation: 1.28,
    contrast: 1.06,
    top: [255, 150, 70, 0.22],
    bottom: [185, 45, 120, 0.28],
    glow: 0.55,
    vignette: 0.5,
  },
  {
    id: 'sunset-pink',
    name: 'Sunset Pink',
    warmth: 0.85,
    saturation: 1.22,
    contrast: 1.05,
    top: [255, 110, 140, 0.22],
    bottom: [150, 40, 140, 0.3],
    glow: 0.5,
    vignette: 0.45,
  },
  {
    id: 'neon-dusk',
    name: 'Neon Dusk',
    warmth: 0.6,
    saturation: 1.18,
    contrast: 1.07,
    top: [120, 80, 255, 0.18],
    bottom: [255, 60, 120, 0.26],
    glow: 0.65,
    vignette: 0.55,
  },
  {
    id: 'vice-nights',
    name: 'Vice Nights',
    warmth: 0.7,
    saturation: 1.2,
    contrast: 1.06,
    top: [40, 220, 200, 0.14],
    bottom: [200, 40, 160, 0.3],
    glow: 0.6,
    vignette: 0.5,
  },
  {
    id: 'amber-heat',
    name: 'Amber Heat',
    warmth: 0.95,
    saturation: 1.24,
    contrast: 1.05,
    top: [255, 170, 40, 0.26],
    bottom: [200, 70, 20, 0.26],
    glow: 0.5,
    vignette: 0.45,
  },
  {
    id: 'cool-dawn',
    name: 'Cool Dawn',
    warmth: 0.45,
    saturation: 1.1,
    contrast: 1.04,
    top: [120, 180, 255, 0.16],
    bottom: [255, 120, 90, 0.2],
    glow: 0.4,
    vignette: 0.4,
  },
];

export const DEFAULT_GRADE_ID = 'golden-hour';

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function rgba(c) {
  return `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
}

// Filter string applied to the photo itself when it is drawn (Chrome/FF).
export function gradeFilter(grade, posterInk) {
  const sat = posterInk ? grade.saturation + 0.12 : grade.saturation;
  const con = posterInk ? grade.contrast + 0.24 : grade.contrast;
  return `saturate(${sat.toFixed(2)}) contrast(${con.toFixed(2)}) brightness(1.02)`;
}
