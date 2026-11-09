// The crooked-casino model: parameter object, lecture defaults, validation, complements.
// PURE: no DOM, no D3.
//
// Coin states are indices 0 = F (Fair), 1 = B (Biased).
// Toss symbols are indices 0 = H (Heads), 1 = T (Tails).

export const F = 0;
export const B = 1;
export const H = 0;
export const T = 1;

export const STATE_LETTERS = ['F', 'B'];
export const STATE_NAMES = ['Fair', 'Biased'];
export const TOSS_LETTERS = ['H', 'T'];
export const TOSS_NAMES = ['Head', 'Tail'];

/**
 * The five free values exposed in the parameter panel. Each row of the
 * starting / transition / emission probabilities has exactly one free value;
 * the other entry is its complement.
 *   pf: P(start F)   fb: P(F→B)   bf: P(B→F)   hf: P(H | F)   hb: P(H | B)
 */
export const CONTROL_KEYS = ['pf', 'fb', 'bf', 'hf', 'hb'];

export const DEFAULT_CONTROLS = Object.freeze({
  pf: 0.5,
  fb: 0.05,
  bf: 0.2,
  hf: 0.5,
  hb: 0.1,
});

export function isValidProb(x) {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
}

export function validateControls(c) {
  return !!c && CONTROL_KEYS.every((k) => isValidProb(c[k]));
}

/** Build the full parameter object from the five free values. */
export function paramsFromControls(c) {
  if (!validateControls(c)) throw new Error('Invalid parameter controls');
  return {
    start: [c.pf, 1 - c.pf],
    trans: [
      [1 - c.fb, c.fb],
      [c.bf, 1 - c.bf],
    ],
    emit: [
      [c.hf, 1 - c.hf],
      [c.hb, 1 - c.hb],
    ],
  };
}

export function controlsFromParams(p) {
  return { pf: p.start[F], fb: p.trans[F][B], bf: p.trans[B][F], hf: p.emit[F][H], hb: p.emit[B][H] };
}

export function defaultParams() {
  return paramsFromControls(DEFAULT_CONTROLS);
}

/** Full validation of a parameter object: every row is a probability distribution. */
export function validateParams(p) {
  const rowOk = (row) =>
    Array.isArray(row) && row.length === 2 && row.every(isValidProb) && Math.abs(row[0] + row[1] - 1) < 1e-9;
  return !!p && rowOk(p.start) && p.trans?.length === 2 && p.trans.every(rowOk) && p.emit?.length === 2 && p.emit.every(rowOk);
}

/** Element-wise natural log of the parameters (log 0 = −∞). */
export function logParams(p) {
  return {
    start: p.start.map(Math.log),
    trans: p.trans.map((r) => r.map(Math.log)),
    emit: p.emit.map((r) => r.map(Math.log)),
  };
}
