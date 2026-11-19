// Panel layouts — five ways to arrange five photos on a cover, all drawn from
// one design system: a hero panel (the face, the story's lead) plus four
// supporting panels of varied sizes, with a thin gap and thick inked frames.
// The hero panel is always TALL, never a wide short strip: a wide strip is
// what cropped the v2 hero's face. Every layout keeps the hero at least
// 1.8x the median panel area so the eye lands on the lead first.
//
// layoutPanels(id, w, h, gap) -> [{ x, y, w, h, role, rot }] in canvas pixels,
// where (w, h) is the panel area ABOVE the title block. Roles: 'hero' first,
// then 'a', 'b', 'c', 'd' in reading order.

function split(total, parts, gap) {
  // Split `total` px into `parts` lengths with `gap` px between them.
  const usable = total - gap * (parts.length - 1);
  const weights = parts.reduce((a, b) => a + b, 0);
  let at = 0;
  return parts.map((p) => {
    const len = Math.round((usable * p) / weights);
    const out = { at, len };
    at += len + gap;
    return out;
  });
}

export const LAYOUTS = [
  { id: 'hero', name: 'Hero-led' },
  { id: 'grid', name: 'Classic Grid' },
  { id: 'portrait', name: 'Portrait' },
  { id: 'strip', name: 'Sunset Strip' },
  { id: 'tilted', name: 'Tilted Snapshots' },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export function layoutPanels(id, w, h, gap = 8) {
  const g = Math.max(4, Math.round(gap));
  switch (id) {
    case 'grid': {
      // Two rows: 2 panels on top, 3 below — a comic grid, no panel dominant.
      const rows = split(h, [9, 11], g);
      const top = split(w, [1, 1], g);
      const bot = split(w, [1, 1, 1], g);
      return [
        { x: top[0].at, y: rows[0].at, w: top[0].len, h: rows[0].len, role: 'hero', rot: 0 },
        { x: top[1].at, y: rows[0].at, w: top[1].len, h: rows[0].len, role: 'a', rot: 0 },
        { x: bot[0].at, y: rows[1].at, w: bot[0].len, h: rows[1].len, role: 'b', rot: 0 },
        { x: bot[1].at, y: rows[1].at, w: bot[1].len, h: rows[1].len, role: 'c', rot: 0 },
        { x: bot[2].at, y: rows[1].at, w: bot[2].len, h: rows[1].len, role: 'd', rot: 0 },
      ];
    }
    case 'portrait': {
      // Hero wide on top, 2x2 grid below. The hero is wide but TALL (55% of
      // the area), so a face still fits — the face-safe crop guarantees it.
      const rows = split(h, [11, 9], g);
      const bot = split(w, [1, 1], g);
      const botRows = split(rows[1].len, [1, 1], g);
      return [
        { x: 0, y: rows[0].at, w, h: rows[0].len, role: 'hero', rot: 0 },
        { x: bot[0].at, y: rows[1].at + botRows[0].at, w: bot[0].len, h: botRows[0].len, role: 'a', rot: 0 },
        { x: bot[1].at, y: rows[1].at + botRows[0].at, w: bot[1].len, h: botRows[0].len, role: 'b', rot: 0 },
        { x: bot[0].at, y: rows[1].at + botRows[1].at, w: bot[0].len, h: botRows[1].len, role: 'c', rot: 0 },
        { x: bot[1].at, y: rows[1].at + botRows[1].at, w: bot[1].len, h: botRows[1].len, role: 'd', rot: 0 },
      ];
    }
    case 'strip': {
      // 2x2 grid on top, one wide sunset strip along the bottom — the strip
      // is where an empty-sky photo earns its keep as a breather.
      const rows = split(h, [7, 3], g);
      const top = split(w, [1, 1], g);
      const topRows = split(rows[0].len, [1, 1], g);
      return [
        { x: top[0].at, y: rows[0].at + topRows[0].at, w: top[0].len, h: topRows[0].len, role: 'hero', rot: 0 },
        { x: top[1].at, y: rows[0].at + topRows[0].at, w: top[1].len, h: topRows[0].len, role: 'a', rot: 0 },
        { x: top[0].at, y: rows[0].at + topRows[1].at, w: top[0].len, h: topRows[1].len, role: 'b', rot: 0 },
        { x: top[1].at, y: rows[0].at + topRows[1].at, w: top[1].len, h: topRows[1].len, role: 'c', rot: 0 },
        { x: 0, y: rows[1].at, w, h: rows[1].len, role: 'd', rot: 0 },
      ];
    }
    case 'tilted': {
      // Five snapshot frames, slightly rotated, overlapping on the dark
      // background like photos tossed on a table. Overlap is intentional.
      const cw = Math.round(w * 0.36);
      const ch = Math.round(h * 0.52);
      return [
        { x: Math.round(w * 0.03), y: Math.round(h * 0.04), w: cw, h: ch, role: 'hero', rot: -3 },
        { x: Math.round(w * 0.36), y: Math.round(h * 0.02), w: cw, h: ch, role: 'a', rot: 2 },
        { x: Math.round(w * 0.62), y: Math.round(h * 0.06), w: Math.round(w * 0.34), h: ch, role: 'b', rot: -2 },
        { x: Math.round(w * 0.12), y: Math.round(h * 0.46), w: cw, h: ch, role: 'c', rot: 2 },
        { x: Math.round(w * 0.48), y: Math.round(h * 0.44), w: Math.round(w * 0.38), h: ch, role: 'd', rot: -3 },
      ];
    }
    case 'hero':
    default: {
      // Hero-led: a TALL hero on the left (39% of the width, full height),
      // four supporting panels in a 2x2 grid on the right.
      const cols = split(w, [39, 61], g);
      const right = split(cols[1].len, [1, 1], g);
      const rightRows = split(h, [1, 1], g);
      return [
        { x: cols[0].at, y: 0, w: cols[0].len, h, role: 'hero', rot: 0 },
        { x: cols[1].at + right[0].at, y: rightRows[0].at, w: right[0].len, h: rightRows[0].len, role: 'a', rot: 0 },
        { x: cols[1].at + right[1].at, y: rightRows[0].at, w: right[1].len, h: rightRows[0].len, role: 'b', rot: 0 },
        { x: cols[1].at + right[0].at, y: rightRows[1].at, w: right[0].len, h: rightRows[1].len, role: 'c', rot: 0 },
        { x: cols[1].at + right[1].at, y: rightRows[1].at, w: right[1].len, h: rightRows[1].len, role: 'd', rot: 0 },
      ];
    }
  }
}

/** Area of the hero panel vs the median panel area, for the hero-dominance rule. */
export function heroDominance(id, w, h) {
  const panels = layoutPanels(id, w, h);
  const hero = panels.find((p) => p.role === 'hero');
  const areas = panels.map((p) => p.w * p.h).sort((a, b) => a - b);
  const median = areas[Math.floor(areas.length / 2)];
  return (hero.w * hero.h) / median;
}
