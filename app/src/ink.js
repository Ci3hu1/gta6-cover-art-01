// Comic-ink image pipeline — pure pixel math, no dependencies, importable from Node
// and from the browser. Turns a photo into inked poster art the way the GTA covers
// are drawn: thick black outlines, flat posterized tones, halftone dots in the
// shadows, paper grain. NOT a colour filter: the edges are detected from the image
// itself and redrawn as ink.
//
// The pipeline runs per panel, on an offscreen canvas, before the colour grade:
//   lift (brighten shadows) -> luminance -> Sobel edges -> dilate to thick ink
//   -> posterize to 5 tones -> map tones through the grade palette
//   -> halftone dots in the dark tones -> seeded grain.
//
// A second, equally important job lives here: face-safe cropping. NEVER crop
// through a face. fitPhotoToPanel() takes a focus point and a "safe box"
// (the head + shoulders, in relative photo coordinates) and guarantees the
// safe box stays fully visible: it shifts the crop window to include it, and
// if the panel is too short to contain it at cover scale it letterboxes the
// photo instead of cutting the face.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Deterministic PRNG (mulberry32) so grain and halftone are stable per seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Sobel edge magnitude (0..~1440) for a grayscale Float32Array, w x h. */
export function sobelMagnitude(gray, w, h) {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
        gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
      const gy =
        -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
        gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
      out[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

/** Binary dilation of a Uint8 mask by `radius` pixels (square structuring). */
export function dilateMask(mask, w, h, radius) {
  if (radius <= 0) return mask;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = 0;
      for (let dy = -radius; dy <= radius && !hit; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          if (mask[yy * w + xx]) {
            hit = 1;
            break;
          }
        }
      }
      out[y * w + x] = hit;
    }
  }
  return out;
}

/** Which of `bands` posterize bands a 0..255 value falls in. */
export function posterizeBand(v, bands = 5) {
  const b = Math.floor((clamp(v, 0, 255) / 256) * bands);
  return b >= bands ? bands - 1 : b;
}

/**
 * Halftone dot test: inside a `cell` px grid, a dot of radius proportional to
 * `darkness` (0..1) is inked at this pixel. Deterministic, no RNG.
 */
export function halftoneDot(x, y, cell, darkness) {
  if (darkness <= 0) return false;
  const cx = Math.floor(x / cell) * cell + cell / 2;
  const cy = Math.floor(y / cell) * cell + cell / 2;
  const dx = x - cx;
  const dy = y - cy;
  const r = (cell / 2) * Math.sqrt(darkness);
  return dx * dx + dy * dy <= r * r;
}

/** Shadow lift: gamma < 1 brightens the dark end so dark photos stay readable. */
export function applyLift(v, lift) {
  if (!lift || lift === 1) return v;
  return 255 * Math.pow(clamp(v, 0, 255) / 255, 1 / lift);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Ink one photo's pixels. `src` is an ImageData (or {data,width,height}).
 * opts: { palette: [5 hex, light -> dark], ink: hex, lift = 1,
 *         inkThreshold = 90 (Sobel magnitude), inkWidth = 1 (dilation px),
 *         halftoneCell = 6, halftoneMax = 0.85, grainSeed = 7, grainAmount = 14 }
 * Returns a fresh ImageData-shaped { data: Uint8ClampedArray, width, height }.
 * The darkest posterize band never goes below the palette's darkest tone, and
 * the lift keeps dark photos from crushing to unreadable black.
 */
export function inkImageData(src, opts) {
  const { width: w, height: h, data } = src;
  const palette = (opts.palette || ['#ffffff', '#cccccc', '#888888', '#444444', '#000000']).map(hexToRgb);
  const inkRgb = hexToRgb(opts.ink || '#111111');
  const lift = opts.lift || 1;
  const inkThreshold = opts.inkThreshold ?? 90;
  const inkWidth = opts.inkWidth ?? 1;
  const halftoneCell = opts.halftoneCell ?? 6;
  const halftoneMax = opts.halftoneMax ?? 0.85;
  const grainAmount = opts.grainAmount ?? 14;
  const rng = mulberry32(opts.grainSeed ?? 7);

  const n = w * h;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = applyLift(data[i * 4], lift);
    const g = applyLift(data[i * 4 + 1], lift);
    const b = applyLift(data[i * 4 + 2], lift);
    gray[i] = luminance(r, g, b);
  }
  const edges = sobelMagnitude(gray, w, h);
  let inkMask = new Uint8Array(n);
  for (let i = 0; i < n; i++) inkMask[i] = edges[i] >= inkThreshold ? 1 : 0;
  inkMask = dilateMask(inkMask, w, h, inkWidth);

  const out = new Uint8ClampedArray(n * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      if (inkMask[i]) {
        out[o] = inkRgb[0];
        out[o + 1] = inkRgb[1];
        out[o + 2] = inkRgb[2];
        out[o + 3] = 255;
        continue;
      }
      const band = posterizeBand(gray[i], 5);
      // Halftone dots only in the two darkest bands, never in the lightest.
      const darkness = band >= 3 ? ((band - 2) / 2) * halftoneMax : 0;
      let rgb = palette[band];
      if (darkness > 0 && halftoneDot(x, y, halftoneCell, darkness)) {
        rgb = inkRgb;
      }
      const grain = (rng() - 0.5) * grainAmount;
      out[o] = clamp(rgb[0] + grain, 0, 255);
      out[o + 1] = clamp(rgb[1] + grain, 0, 255);
      out[o + 2] = clamp(rgb[2] + grain, 0, 255);
      out[o + 3] = 255;
    }
  }
  return { data: out, width: w, height: h };
}

/**
 * The subject box: the part of a photo that must never leave the frame —
 * the face for a portrait, the hands+camera for the camera shot, the cloud
 * band for the skyline, the ridge for the mountain shot. Derived from the
 * sample's focus point (its centre) and its safe box (its size): the
 * subject is the middle ~45% of the safe box. The safe box (head +
 * shoulders) is included when it fits; the subject is mandatory.
 */
export function subjectBox(focus, safe, photoW, photoH) {
  if (!safe) return null;
  const w = safe.w * 0.45 * photoW;
  const h = safe.h * 0.42 * photoH;
  return {
    x: focus.x * photoW - w / 2,
    y: focus.y * photoH - h / 2,
    w,
    h,
  };
}

/**
 * Face-safe cover fit. Returns drawImage args for drawing a photo into a
 * panel. photoW/photoH: photo size. panelW/panelH: panel size.
 * focus: {x, y} in 0..1 photo coords — the subject to centre on.
 * safe: {x, y, w, h} in 0..1 photo coords — a box (head + shoulders) that
 * is included when it fits. The crop window is centred on the focus, then:
 *   1. shifted so the SUBJECT box is fully inside it (mandatory);
 *   2. shifted again so the whole SAFE box is inside, but only when the
 *      safe box fits the window and only if the subject stays inside;
 *   3. if the subject itself is bigger than the crop window, the photo is
 *      letterboxed, anchored on the subject's centre instead of cutting it.
 * A wide short panel therefore shows the face full-bleed (shoulders may
 * crop) instead of shrinking the photo into a strip with empty sides.
 * Returns { sx, sy, sw, sh, dx, dy, dw, dh, letterboxed }.
 */
export function fitPhotoToPanel(photoW, photoH, panelW, panelH, focus, safe) {
  const fx = focus ? focus.x : 0.5;
  const fy = focus ? focus.y : 0.5;
  const scale = Math.max(panelW / photoW, panelH / photoH);
  const cw = panelW / scale;
  const ch = panelH / scale;
  const maxX = Math.max(0, photoW - cw);
  const maxY = Math.max(0, photoH - ch);
  let cx = clamp(fx * photoW - cw / 2, 0, maxX);
  let cy = clamp(fy * photoH - ch / 2, 0, maxY);

  if (safe) {
    const sb = { x: safe.x * photoW, y: safe.y * photoH, w: safe.w * photoW, h: safe.h * photoH };
    const subj = subjectBox(focus, safe, photoW, photoH);
    // 1) Mandatory: the subject stays in frame.
    if (subj.x < cx) cx = subj.x;
    if (subj.x + subj.w > cx + cw) cx = subj.x + subj.w - cw;
    if (subj.y < cy) cy = subj.y;
    if (subj.y + subj.h > cy + ch) cy = subj.y + subj.h - ch;
    cx = clamp(cx, 0, maxX);
    cy = clamp(cy, 0, maxY);
    // 2) Best effort: the whole safe box, when it fits and the subject
    //    stays inside.
    if (sb.w <= cw + 1 && sb.h <= ch + 1) {
      let nx = cx;
      let ny = cy;
      if (sb.x < nx) nx = sb.x;
      if (sb.x + sb.w > nx + cw) nx = sb.x + sb.w - cw;
      if (sb.y < ny) ny = sb.y;
      if (sb.y + sb.h > ny + ch) ny = sb.y + sb.h - ch;
      nx = clamp(nx, 0, maxX);
      ny = clamp(ny, 0, maxY);
      const subjInside =
        subj.x >= nx - 1 && subj.y >= ny - 1 &&
        subj.x + subj.w <= nx + cw + 1 && subj.y + subj.h <= ny + ch + 1;
      if (subjInside) { cx = nx; cy = ny; }
    }
    // 3) The subject itself does not fit the window: letterbox, anchored
    //    on the subject's centre (never on the whole photo — that cuts the
    //    top, exactly where faces are).
    if (subj.w > cw + 1 || subj.h > ch + 1) {
      const s2 = Math.min(panelW / subj.w, panelH / subj.h);
      const dw = photoW * s2;
      const dh = photoH * s2;
      const dx = panelW / 2 - (subj.x + subj.w / 2) * s2;
      const dy = panelH / 2 - (subj.y + subj.h / 2) * s2;
      return {
        sx: 0, sy: 0, sw: photoW, sh: photoH,
        dx, dy, dw, dh,
        letterboxed: true,
      };
    }
  }
  return {
    sx: Math.round(cx * 100) / 100, sy: Math.round(cy * 100) / 100,
    sw: Math.round(cw * 100) / 100, sh: Math.round(ch * 100) / 100,
    dx: 0, dy: 0, dw: panelW, dh: panelH,
    letterboxed: false,
  };
}
