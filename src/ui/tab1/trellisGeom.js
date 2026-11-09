// Shared trellis geometry: "How HMMs work" traces coin paths on it (pathTrellis.js); "Speeding it up"
// runs the forward, backward and Viterbi passes on a taller version (speed/speedTrellis.js).

export const R = 31;
export const ROW_Y = [66, 160];
export const START = { x: 42, y: 113, r: 21 };
export const COL_X0 = 165;
export const H = 194;
export const HEAD_Y = 18;

/** "Speeding it up": taller nodes (name, emission, α and β) and room for a posterior bar under Biased. */
export const GEOM_TALL = { R: 38, ROW_Y: [74, 182], START: { x: 42, y: 128, r: 21 }, H: 254, HEAD_Y: 20 };

const MAX_GAP = 420;

/** Column spacing grows with the available width (availW, CSS px) so the trellis fills its card. */
export function layout(n, availW = 0) {
  let gap = 0;
  if (n > 1) {
    const base = Math.min(260, 600 / (n - 1));
    const fill = (availW - COL_X0 - 60) / (n - 1);
    gap = Math.max(base, Math.min(MAX_GAP, fill));
  }
  return { width: COL_X0 + (n - 1) * gap + 60, colX: (k) => COL_X0 + k * gap };
}

export const nodePos = (L, c, s) => ({ x: L.colX(c), y: ROW_Y[s] });

/** Label position for the arrow r → s between two columns. F→F above its arrow, B→B below it,
 *  so neither collides with the diagonal labels. */
export function arrowLabelPos(a, b, r, s) {
  if (r === s) return { x: (a.x + b.x) / 2, y: s === 0 ? a.y - 8 : a.y + 18 };
  return { x: a.x + (b.x - a.x) * 0.3 + 20, y: a.y + (b.y - a.y) * 0.3 + (r === 0 ? 2 : 12) };
}

export function startLabelPos(a, b, s) {
  return { x: (a.x + b.x) / 2 - 8, y: (a.y + b.y) / 2 + (s === 0 ? -12 : 20) };
}

/** Endpoints of an arrow from circle a (radius ra) to circle b (radius rb). */
export function arrowPts(a, b, ra, rb) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  return { x1: a.x + ux * (ra + 2), y1: a.y + uy * (ra + 2), x2: b.x - ux * (rb + 3), y2: b.y - uy * (rb + 3) };
}

/** Arrowhead markers `${prefix}-${style}`; `classFor(style)` gives the head's CSS class. */
export function addMarkers(svg, prefix, styles, classFor = (c) => c) {
  const defs = svg.append('defs');
  for (const c of styles) {
    defs
      .append('marker')
      .attr('id', `${prefix}-${c}`)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 9)
      .attr('markerHeight', 9)
      .attr('markerUnits', 'userSpaceOnUse')
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M0,0 L10,5 L0,10 z')
      .attr('class', `ah ${classFor(c)}`);
  }
}
