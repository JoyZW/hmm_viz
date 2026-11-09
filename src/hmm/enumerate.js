// Brute-force enumeration of every coin path for a short toss sequence. PURE.
import { B } from './model.js';

export const ENUMERATE_MAX = 12;

/**
 * Lists all 2ⁿ coin paths in lexicographic order with F before B
 * (FFF, FFB, FBF, …, BBB).
 * @returns {{
 *   rows: {states: number[], factors: {trans: number, emit: number, isStart: boolean}[], joint: number}[],
 *   likelihood: number
 * }}
 * `factors[0].trans` is the starting probability; later entries are transition probabilities.
 */
export function enumerate(params, tosses) {
  const n = tosses.length;
  if (n < 1 || n > ENUMERATE_MAX) throw new Error(`enumerate: length must be 1–${ENUMERATE_MAX}`);
  const rows = [];
  let likelihood = 0;
  for (let m = 0; m < 1 << n; m++) {
    const states = [];
    for (let i = 0; i < n; i++) states.push((m >> (n - 1 - i)) & 1);
    const factors = [];
    let joint = 1;
    for (let i = 0; i < n; i++) {
      const s = states[i];
      const trans = i === 0 ? params.start[s] : params.trans[states[i - 1]][s];
      const emit = params.emit[s][tosses[i]];
      factors.push({ trans, emit, isStart: i === 0 });
      joint *= trans * emit;
    }
    rows.push({ states, factors, joint });
    likelihood += joint;
  }
  return { rows, likelihood };
}

/**
 * Posterior by filtering: keep the rows with B at toss t (0-based) and divide their sum by the likelihood.
 */
export function posteriorByFiltering(table, t) {
  const rows = [];
  let numerator = 0;
  table.rows.forEach((r, i) => {
    if (r.states[t] === B) {
      rows.push(i);
      numerator += r.joint;
    }
  });
  return { rows, numerator, posterior: table.likelihood > 0 ? numerator / table.likelihood : NaN };
}

/** Index of the row with the largest joint probability (first such row on ties). */
export function argmaxRow(table) {
  let best = 0;
  for (let i = 1; i < table.rows.length; i++) {
    if (table.rows[i].joint > table.rows[best].joint) best = i;
  }
  return best;
}
