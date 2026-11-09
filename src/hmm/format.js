// Number formatting. PURE.

export const MINUS = '−';

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '-': '₋' };

export function sup(n) {
  return String(n)
    .split('')
    .map((c) => SUP[c] ?? c)
    .join('');
}

export function sub(n) {
  return String(n)
    .split('')
    .map((c) => SUB[c] ?? c)
    .join('');
}

/** Replace ASCII hyphen-minus with a true minus sign. */
export function minus(s) {
  return String(s).replace(/-/g, MINUS);
}

/**
 * Scientific notation computed from a natural log, never by exponentiating:
 * ln = −1842.3 → {mantissa: '7.9', exponent: −801}.
 */
export function sciPartsFromLog(ln, sig = 2) {
  if (ln === -Infinity) return { zero: true, mantissa: '0', exponent: 0 };
  if (Number.isNaN(ln)) return { nan: true, mantissa: 'NaN', exponent: 0 };
  const l10 = ln / Math.LN10;
  let e = Math.floor(l10);
  let m = Math.pow(10, l10 - e);
  let ms = m.toFixed(sig - 1);
  if (Number(ms) >= 10) {
    e += 1;
    ms = (m / 10).toFixed(sig - 1);
  }
  return { mantissa: ms, exponent: e };
}

/** "3.1 × 10⁻⁸⁰⁰" from ln value. −∞ → "0". */
export function sciFromLog(ln, sig = 2) {
  const p = sciPartsFromLog(ln, sig);
  if (p.zero) return '0';
  if (p.nan) return 'NaN';
  return `${p.mantissa} × 10${sup(p.exponent)}`;
}

/** "−1842.3"; −∞ → "−∞". */
export function fmtLn(ln, decimals = 1) {
  if (ln === -Infinity) return `${MINUS}∞`;
  if (Number.isNaN(ln)) return 'NaN';
  return minus(ln.toFixed(decimals));
}

/** Tab 1: 3 significant figures, plain decimals (0.119, 0.0564, 0.25). */
export function sig3(x) {
  if (x === 0) return '0';
  if (Number.isNaN(x)) return 'NaN';
  if (!Number.isFinite(x)) return String(x);
  if (Math.abs(x) < 1e-4) return sciFromLog(Math.log(Math.abs(x)), 3);
  return minus(String(Number(x.toPrecision(3))));
}

/** 4 decimals for the enumeration table's joint probabilities (tiny non-zero values fall back to sci). */
export function fixed4(x) {
  if (x > 0 && x < 5e-5) return sciFromLog(Math.log(x), 2);
  return x.toFixed(4);
}

/** A model parameter: up to 4 significant digits, padded to at least `minDecimals` (0.2 → "0.20"). */
export function fmtProb(x, minDecimals = 1) {
  let s = String(Number(x.toPrecision(4)));
  if (s.includes('e')) return x.toExponential(2);
  const dot = s.indexOf('.');
  const dec = dot === -1 ? 0 : s.length - dot - 1;
  if (dec < minDecimals) s = (dot === -1 ? s + '.' : s) + '0'.repeat(minDecimals - dec);
  return s;
}

export function fmtPercent(x, decimals = 1) {
  return `${(x * 100).toFixed(decimals)}%`;
}
