// Precision comparison: run all three precision methods and summarise how they differ. PURE.
import { viterbi } from './viterbi.js';
import { forwardBackward } from './forwardBackward.js';

export const METHOD_ORDER = ['naive', 'rescaled', 'log'];

function minPositive(tables) {
  let m = Infinity;
  for (const table of tables) {
    for (const row of table) {
      for (const v of row) if (v > 0 && v < m) m = v;
    }
  }
  return m === Infinity ? null : m;
}

function minFinite(tables) {
  let m = Infinity;
  for (const table of tables) {
    for (const row of table) {
      for (const v of row) if (Number.isFinite(v) && v < m) m = v;
    }
  }
  return m === Infinity ? null : m;
}

/**
 * @returns {{ methods: Record<string, {
 *   logLikelihood: number, firstUnderflow: number|null|undefined, nanPosteriors: number,
 *   viterbiDiffers: number, smallestStored: {kind: 'value', value: number|null} | {kind: 'log', minLog: number|null}
 * }>, fb: object, vit: object }}
 * firstUnderflow is 1-based (null = none); undefined for the stable methods (N/A).
 */
export function precisionReport(params, tosses) {
  const fb = {};
  const vit = {};
  for (const m of METHOD_ORDER) {
    fb[m] = forwardBackward(params, tosses, m);
    vit[m] = viterbi(params, tosses, m);
  }
  const n = tosses.length;
  const ref = vit.log.path;
  const methods = {};
  for (const m of METHOD_ORDER) {
    let nan = 0;
    for (let t = 0; t < n; t++) if (!Number.isFinite(fb[m].posterior[t])) nan++;
    let differs = 0;
    for (let t = 0; t < n; t++) if (vit[m].path[t] !== ref[t]) differs++;
    const deltas = vit[m].columns.map((c) => c.value);
    methods[m] = {
      logLikelihood: fb[m].logLikelihood,
      nanPosteriors: nan,
      viterbiDiffers: differs,
      firstUnderflow: undefined,
      smallestStored:
        m === 'log'
          ? { kind: 'log', minLog: minFinite([fb[m].alpha, fb[m].beta, deltas]) }
          : { kind: 'value', value: minPositive([fb[m].alpha, fb[m].beta, deltas]) },
    };
  }
  let first = null;
  for (let t = 0; t < n && first === null; t++) {
    for (let s = 0; s < 2; s++) {
      const aUnder = fb.naive.alpha[t][s] === 0 && Number.isFinite(fb.log.alpha[t][s]);
      const dUnder = vit.naive.columns[t].value[s] === 0 && Number.isFinite(vit.log.columns[t].value[s]);
      if (aUnder || dUnder) {
        first = t + 1;
        break;
      }
    }
  }
  methods.naive.firstUnderflow = first;
  return { methods, fb, vit };
}
