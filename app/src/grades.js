// grades.js — six gentle photographic colour grades for Leonida Nights.
// Every grade is a colour grade ONLY: warmth, shadow/highlight tint, glow and
// vignette. No posterize, no halftone, no Sobel edges, no ink outlines — the
// photos stay clean and photographic, faces untouched. (v3 drops the v2.1
// comic-ink pipeline entirely; that is what the owner rejected.)
//
// A grade is pure data so Node tests can import it without a DOM.

export const GRADES = [
  {
    id: 'vice-sunset', name: 'Vice Sunset',
    warmth: 0.30, shadow: '#16283f', highlight: '#ff9a5c',
    glow: 0.50, vignette: 0.35, saturation: 1.15, brightness: 1.03,
  },
  {
    id: 'neon-night', name: 'Neon Night',
    warmth: 0.05, shadow: '#140a33', highlight: '#ff4fd8',
    glow: 0.60, vignette: 0.45, saturation: 1.25, brightness: 0.98,
  },
  {
    id: 'golden-coast', name: 'Golden Coast',
    warmth: 0.35, shadow: '#3a2a18', highlight: '#ffd27a',
    glow: 0.55, vignette: 0.25, saturation: 1.10, brightness: 1.05,
  },
  {
    id: 'twilight-gold', name: 'Twilight Gold',
    warmth: 0.25, shadow: '#241a3a', highlight: '#ffb347',
    glow: 0.45, vignette: 0.40, saturation: 1.12, brightness: 1.00,
  },
  {
    id: 'teal-pink', name: 'Teal Pink',
    warmth: 0.10, shadow: '#062a33', highlight: '#ff7ab8',
    glow: 0.35, vignette: 0.30, saturation: 1.20, brightness: 1.00,
  },
  {
    id: 'noir', name: 'Noir',
    warmth: 0.00, shadow: '#000000', highlight: '#cfd8e6',
    glow: 0.10, vignette: 0.55, saturation: 0.85, brightness: 0.96,
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Apply a grade over a photo already drawn into rect (x, y, w, h) on ctx.
// Pure canvas overlay work — no pixel rewriting, so faces stay photographic.
export function applyGrade(ctx, x, y, w, h, grade) {
  ctx.save();
  // Warm sunset lift (soft-light keeps skin tones smooth).
  if (grade.warmth > 0) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = grade.warmth;
    ctx.fillStyle = '#ff8a3c';
    ctx.fillRect(x, y, w, h);
  }
  // Teal shadows / pink highlights split tone.
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = grade.shadow;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = grade.highlight;
  ctx.fillRect(x, y, w, h);
  // Sky glow from the top.
  if (grade.glow > 0) {
    const g = ctx.createRadialGradient(x + w / 2, y, 0, x + w / 2, y, Math.max(w, h) * 0.9);
    g.addColorStop(0, hexA(grade.highlight, 0.35 * grade.glow));
    g.addColorStop(1, hexA(grade.highlight, 0));
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  // Gentle vignette to seat the panel.
  if (grade.vignette > 0) {
    const v = ctx.createRadialGradient(
      x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
      x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
    );
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(0,0,0,${0.45 * grade.vignette})`);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = v;
    ctx.fillRect(x, y, w, h);
  }
  // Lift the deepest shadows a touch so no panel ever reads nearly black.
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Light film grain: a small deterministic noise tile, drawn with 'overlay'
// at very low alpha. Deterministic (seeded) so exports are reproducible.
let grainTile = null;
export function drawGrain(ctx, x, y, w, h, amount) {
  if (amount <= 0) return;
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 128; grainTile.height = 128;
    const g = grainTile.getContext('2d');
    const img = g.createImageData(128, 128);
    let seed = 20261120;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 118 + Math.floor(rnd() * 20);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  const pat = ctx.createPattern(grainTile, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
