// Forward–backward with three precision methods. PURE.
//
//   αₜ(s) = (Σᵣ αₜ₋₁(r)·trans(r, s))·emit(s, xₜ)
//   βₜ(r) = Σₛ trans(r, s)·emit(s, xₜ₊₁)·βₜ₊₁(s),   βₙ = 1
//   posterior P(B at t | tosses) = αₜ(B)·βₜ(B) / likelihood
import { F, B, logParams } from './model.js';

export const METHODS = ['naive', 'rescaled', 'log'];

/** ln(eᵃ + eᵇ), safe for −∞ inputs (lse(−∞, −∞) = −∞, never NaN). */
export function logSumExp(a, b) {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const m = a > b ? a : b;
  return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
}

/**
 * @param {'naive'|'rescaled'|'log'} method
 * @returns {{
 *   method: string,
 *   alpha: number[][], beta: number[][],   // raw stored numbers (α, scaled α̂, or ln α)
 *   logAlpha: number[][],                  // true ln αₜ(s) for every method
 *   logScales: number[]|null,              // rescaled only: ln cₜ
 *   logLikelihood: number,
 *   posterior: Float64Array,               // P(B at t | tosses)
 *   impossible: boolean                    // stable methods only: likelihood is exactly 0
 * }}
 */
export function forwardBackward(params, tosses, method = 'rescaled') {
  if (method === 'naive') return naive(params, tosses);
  if (method === 'rescaled') return rescaled(params, tosses);
  if (method === 'log') return logSpace(params, tosses);
  throw new Error(`Unknown method ${method}`);
}

function naive(p, x) {
  const n = x.length;
  const alpha = new Array(n);
  const beta = new Array(n);
  alpha[0] = [p.start[F] * p.emit[F][x[0]], p.start[B] * p.emit[B][x[0]]];
  for (let t = 1; t < n; t++) {
    const a = alpha[t - 1];
    alpha[t] = [0, 1].map((s) => (a[F] * p.trans[F][s] + a[B] * p.trans[B][s]) * p.emit[s][x[t]]);
  }
  beta[n - 1] = [1, 1];
  for (let t = n - 2; t >= 0; t--) {
    const b = beta[t + 1];
    const e = [p.emit[F][x[t + 1]], p.emit[B][x[t + 1]]];
    beta[t] = [0, 1].map((r) => p.trans[r][F] * e[F] * b[F] + p.trans[r][B] * e[B] * b[B]);
  }
  const L = alpha[n - 1][F] + alpha[n - 1][B];
  const posterior = new Float64Array(n);
  for (let t = 0; t < n; t++) posterior[t] = (alpha[t][B] * beta[t][B]) / L;
  return {
    method: 'naive',
    alpha,
    beta,
    logAlpha: alpha.map((a) => [Math.log(a[F]), Math.log(a[B])]),
    logScales: null,
    logLikelihood: Math.log(L),
    posterior,
    impossible: false,
  };
}

function rescaled(p, x) {
  const n = x.length;
  const alpha = new Array(n);
  const beta = new Array(n);
  const logAlpha = new Array(n);
  const c = new Array(n);
  const logScales = new Array(n);
  let impossible = false;
  let cum = 0;
  for (let t = 0; t < n; t++) {
    let a;
    if (t === 0) a = [p.start[F] * p.emit[F][x[0]], p.start[B] * p.emit[B][x[0]]];
    else {
      const prev = alpha[t - 1];
      a = [0, 1].map((s) => (prev[F] * p.trans[F][s] + prev[B] * p.trans[B][s]) * p.emit[s][x[t]]);
    }
    const sum = a[F] + a[B];
    if (sum > 0) {
      a[F] /= sum;
      a[B] /= sum;
      c[t] = sum;
      logScales[t] = Math.log(sum);
    } else {
      c[t] = 0;
      logScales[t] = -Infinity;
      impossible = true;
    }
    cum += logScales[t];
    alpha[t] = a;
    logAlpha[t] = [a[F] > 0 ? Math.log(a[F]) + cum : -Infinity, a[B] > 0 ? Math.log(a[B]) + cum : -Infinity];
  }
  const posterior = new Float64Array(n);
  if (impossible) {
    for (let t = 0; t < n; t++) beta[t] = [0, 0];
    return { method: 'rescaled', alpha, beta, logAlpha, logScales, logLikelihood: -Infinity, posterior, impossible };
  }
  beta[n - 1] = [1, 1];
  for (let t = n - 2; t >= 0; t--) {
    const b = beta[t + 1];
    const e = [p.emit[F][x[t + 1]], p.emit[B][x[t + 1]]];
    const ct = c[t + 1];
    beta[t] = [0, 1].map((r) => (p.trans[r][F] * e[F] * b[F] + p.trans[r][B] * e[B] * b[B]) / ct);
  }
  for (let t = 0; t < n; t++) posterior[t] = alpha[t][B] * beta[t][B];
  const logLikelihood = logScales.reduce((s, v) => s + v, 0);
  return { method: 'rescaled', alpha, beta, logAlpha, logScales, logLikelihood, posterior, impossible };
}

function logSpace(p, x) {
  const n = x.length;
  const lp = logParams(p);
  const la = new Array(n);
  const lb = new Array(n);
  la[0] = [lp.start[F] + lp.emit[F][x[0]], lp.start[B] + lp.emit[B][x[0]]];
  for (let t = 1; t < n; t++) {
    const a = la[t - 1];
    la[t] = [0, 1].map((s) => logSumExp(a[F] + lp.trans[F][s], a[B] + lp.trans[B][s]) + lp.emit[s][x[t]]);
  }
  lb[n - 1] = [0, 0];
  for (let t = n - 2; t >= 0; t--) {
    const b = lb[t + 1];
    const e = [lp.emit[F][x[t + 1]], lp.emit[B][x[t + 1]]];
    lb[t] = [0, 1].map((r) => logSumExp(lp.trans[r][F] + e[F] + b[F], lp.trans[r][B] + e[B] + b[B]));
  }
  const logLikelihood = logSumExp(la[n - 1][F], la[n - 1][B]);
  const impossible = logLikelihood === -Infinity;
  const posterior = new Float64Array(n);
  if (!impossible) {
    for (let t = 0; t < n; t++) posterior[t] = Math.exp(la[t][B] + lb[t][B] - logLikelihood);
  }
  return { method: 'log', alpha: la, beta: lb, logAlpha: la, logScales: null, logLikelihood, posterior, impossible };
}
