// "Speeding it up" — which step of which pass is showing. No DOM.
//
//   Q1 'lik'  forward pass, one node per step (2n), then the total:            0 … 2n+1
//   Q2 'post' forward pass (starts already filled, at step 2n), β = 1 column,
//             backward pass one node per step (2(n−1)), posterior one toss per step: 0 … 5n−1
//   Q3 'vit'  Viterbi pass, one node per step (2n), then the backtrack (n):       0 … 3n
//
// Nodes are computed F then B within a column; forward/Viterbi left to right, backward right to left.

export function speedTotal(q, n) {
  if (q === 'lik') return 2 * n + 1;
  if (q === 'post') return 5 * n - 1;
  return 3 * n;
}

/** Where a question starts (and where Reset goes): Q2 begins with the forward pass already filled. */
export function speedStart(q, n) {
  return q === 'post' ? 2 * n : 0;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * @returns {{
 *   phase: 'intro'|'fwd'|'ready'|'total'|'binit'|'bwd'|'post'|'bt',
 *   fwd: number,        // forward / Viterbi nodes computed (0 … 2n)
 *   bInit: boolean,     // β at the last toss is set to 1
 *   bwd: number,        // backward nodes computed after that (0 … 2(n−1))
 *   post: number,       // tosses whose posterior is computed (0 … n)
 *   backtrack: number,  // backtrack steps taken (0 … n)
 *   total: boolean,     // Q1: the last column has been added up
 *   isA(c, s), isB(c, s), hasPost(c), onPath(c),
 *   curNode: {c, s}|null, curCol: number|null
 * }}
 */
export function decodeSpeed(q, n, k) {
  const fwd = Math.min(k, 2 * n);
  const r = k - 2 * n; // Q2: steps after the forward pass
  const d = {
    fwd,
    bInit: q === 'post' && r >= 1,
    bwd: q === 'post' ? clamp(r - 1, 0, 2 * (n - 1)) : 0,
    post: q === 'post' ? clamp(r - 1 - 2 * (n - 1), 0, n) : 0,
    backtrack: q === 'vit' ? Math.max(0, k - 2 * n) : 0,
    total: q === 'lik' && k === 2 * n + 1,
  };

  if (k === 0) d.phase = 'intro';
  else if (q === 'lik') d.phase = d.total ? 'total' : 'fwd';
  else if (q === 'vit') d.phase = d.backtrack > 0 ? 'bt' : 'fwd';
  else if (r < 0) d.phase = 'fwd';
  else if (r === 0) d.phase = 'ready';
  else if (r === 1) d.phase = 'binit';
  else if (r <= 1 + 2 * (n - 1)) d.phase = 'bwd';
  else d.phase = 'post';

  d.isA = (c, s) => 2 * c + s < d.fwd;
  d.isB = (c, s) => q === 'post' && (c === n - 1 ? d.bInit : (n - 2 - c) * 2 + s < d.bwd);
  d.hasPost = (c) => c < d.post;
  d.onPath = (c) => d.backtrack > 0 && c >= n - d.backtrack;

  d.curNode = null;
  d.curCol = null;
  if (d.phase === 'fwd') {
    const j = d.fwd - 1;
    d.curNode = { c: Math.floor(j / 2), s: j % 2 };
  } else if (d.phase === 'bwd') {
    const j = d.bwd - 1;
    d.curNode = { c: n - 2 - Math.floor(j / 2), s: j % 2 };
  }
  if (d.curNode) d.curCol = d.curNode.c;
  else if (d.phase === 'binit') d.curCol = n - 1;
  else if (d.phase === 'post') d.curCol = d.post - 1;
  else if (d.phase === 'bt') d.curCol = n - d.backtrack;
  return d;
}
