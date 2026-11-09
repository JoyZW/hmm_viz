// Viterbi recursion with three precision methods. PURE.
//
//   δ₁(s) = start(s)·emit(s, x₁)
//   δₜ(s) = maxᵣ[δₜ₋₁(r)·trans(r, s)]·emit(s, xₜ),   φₜ(s) = argmaxᵣ
//
// Tie-break rule everywhere: on equal candidates prefer F.
import { F, B, logParams } from './model.js';

export const METHODS = ['naive', 'rescaled', 'log'];

/**
 * @param {'naive'|'rescaled'|'log'} method
 * @returns {{
 *   method: string,
 *   columns: {
 *     t: number, toss: number,
 *     value: number[],      // the raw numbers this method stores (δ, scaled δ, or ln δ)
 *     logDelta: number[],   // true ln δₜ(s), recovered for every method
 *     cand: number[][]|null,    // cand[s] = [fromF, fromB] in the method's own representation
 *     candLog: number[][]|null, // the same candidates as true logs: ln δₜ₋₁(r) + ln trans(r, s)
 *     phi: number[]|null,       // φₜ(s)
 *     winner: number[]|null,    // same as phi (the winning previous state)
 *     emitLog: number[],
 *   }[],
 *   path: number[], lastState: number, logJoint: number
 * }}
 */
export function viterbi(params, tosses, method = 'log') {
  if (!METHODS.includes(method)) throw new Error(`Unknown method ${method}`);
  const n = tosses.length;
  const lp = logParams(params);
  const columns = new Array(n);
  const isLog = method === 'log';
  let logScale = 0; // rescaled: Σ ln(column max) so far

  for (let t = 0; t < n; t++) {
    const x = tosses[t];
    const value = [0, 0];
    const emitLog = [lp.emit[F][x], lp.emit[B][x]];
    let cand = null;
    let candLog = null;
    let phi = null;
    const prevScale = logScale;

    if (t === 0) {
      for (let s = 0; s < 2; s++) {
        value[s] = isLog ? lp.start[s] + lp.emit[s][x] : params.start[s] * params.emit[s][x];
      }
    } else {
      const prev = columns[t - 1].value;
      cand = [
        [0, 0],
        [0, 0],
      ];
      candLog = [
        [0, 0],
        [0, 0],
      ];
      phi = [0, 0];
      for (let s = 0; s < 2; s++) {
        for (let r = 0; r < 2; r++) {
          cand[s][r] = isLog ? prev[r] + lp.trans[r][s] : prev[r] * params.trans[r][s];
          candLog[s][r] = isLog ? cand[s][r] : Math.log(cand[s][r]) + (method === 'rescaled' ? prevScale : 0);
        }
        phi[s] = cand[s][B] > cand[s][F] ? B : F; // prefer F on ties (and on −∞ vs −∞, 0 vs 0)
        value[s] = isLog ? cand[s][phi[s]] + lp.emit[s][x] : cand[s][phi[s]] * params.emit[s][x];
      }
    }

    if (method === 'rescaled') {
      const c = Math.max(value[0], value[1]);
      if (c > 0) {
        value[0] /= c;
        value[1] /= c;
        logScale += Math.log(c);
      } else {
        logScale = -Infinity;
      }
    }

    let logDelta;
    if (isLog) logDelta = [value[0], value[1]];
    else if (method === 'naive') logDelta = [Math.log(value[0]), Math.log(value[1])];
    else logDelta = [Math.log(value[0]) + logScale, Math.log(value[1]) + logScale];
    // guard: (−∞) + (−∞) is fine, but never let NaN in through 0·∞ style arithmetic
    logDelta = logDelta.map((v) => (Number.isNaN(v) ? -Infinity : v));

    columns[t] = { t, toss: x, value, logDelta, cand, candLog, phi, winner: phi, emitLog };
  }

  const last = columns[n - 1].value;
  const lastState = last[B] > last[F] ? B : F;
  const path = new Array(n);
  path[n - 1] = lastState;
  for (let t = n - 1; t > 0; t--) path[t - 1] = columns[t].phi[path[t]];

  return { method, columns, path, lastState, logJoint: columns[n - 1].logDelta[lastState] };
}

/** Per-column argmax of δ (prefer F on ties): the "best so far" state used by the overview strip. */
export function columnArgmax(vit) {
  const out = new Uint8Array(vit.columns.length);
  vit.columns.forEach((c, t) => {
    out[t] = c.value[B] > c.value[F] ? B : F;
  });
  return out;
}
