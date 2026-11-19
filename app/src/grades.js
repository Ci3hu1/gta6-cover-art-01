// Gradient-map colour grades for the cover engine. Each grade is a list of
// [position, r, g, b] stops; a photo's luminance is mapped through them, so a
// plain photo comes out as a Vice City sunset, a neon night, and so on.
// Every grade is original work: no palette was taken from any game.
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    stops: [[0, 26, 11, 46], [0.35, 122, 30, 90], [0.62, 255, 94, 58], [0.82, 255, 179, 71], [1, 255, 243, 196]],
  },
  neon: {
    label: 'Neon Night',
    stops: [[0, 5, 5, 16], [0.3, 46, 16, 92], [0.58, 255, 46, 136], [0.8, 64, 224, 255], [1, 255, 255, 255]],
  },
  gold: {
    label: 'Gold Hour',
    stops: [[0, 32, 20, 2], [0.35, 146, 64, 14], [0.62, 245, 158, 11], [0.85, 255, 214, 120], [1, 255, 247, 214]],
  },
  teal: {
    label: 'Teal Pink',
    stops: [[0, 2, 20, 26], [0.32, 13, 110, 110], [0.6, 236, 72, 153], [0.82, 255, 150, 200], [1, 255, 228, 241]],
  },
  noir: {
    label: 'Mono Noir',
    stops: [[0, 0, 0, 0], [0.3, 38, 38, 44], [0.65, 150, 150, 158], [1, 255, 255, 255]],
  },
};

export const GRADE_IDS = Object.keys(GRADES);

/** Builds a 256-entry lookup table (Uint8ClampedArray, r/g/b triples) for a grade. */
export function buildGradeLUT(gradeId) {
  const grade = GRADES[gradeId] ?? GRADES.sunset;
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = grade.stops[0];
    let b = grade.stops[grade.stops.length - 1];
    for (let s = 0; s < grade.stops.length - 1; s++) {
      if (t >= grade.stops[s][0] && t <= grade.stops[s + 1][0]) { a = grade.stops[s]; b = grade.stops[s + 1]; break; }
    }
    const span = (b[0] - a[0]) || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    lut[i * 3] = Math.round(a[1] + (b[1] - a[1]) * f);
    lut[i * 3 + 1] = Math.round(a[2] + (b[2] - a[2]) * f);
    lut[i * 3 + 2] = Math.round(a[3] + (b[3] - a[3]) * f);
  }
  return lut;
}

/** Applies a grade LUT in place to an ImageData's pixels (luminance -> gradient map). */
export function applyGradeLUT(imageData, lut) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    let lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    lum = Math.min(255, Math.max(0, (lum - 127.5) * 1.18 + 127.5));
    const idx = (lum | 0) * 3;
    d[i] = lut[idx];
    d[i + 1] = lut[idx + 1];
    d[i + 2] = lut[idx + 2];
  }
  return imageData;
}
