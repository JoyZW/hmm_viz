import { expect } from 'vitest';

export const close = (x, target, tol) => {
  expect(Math.abs(x - target), `${x} vs ${target}`).toBeLessThan(tol);
};

/** Relative tolerance comparison (absolute near zero); treats equal infinities as equal. */
export const relClose = (a, b, rel = 1e-9, abs = 1e-12) => {
  if (a === b) return;
  expect(Number.isFinite(a) && Number.isFinite(b), `${a} vs ${b}`).toBe(true);
  expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(Math.max(abs, rel * Math.max(Math.abs(a), Math.abs(b))));
};

export const seq = (s) => s.replace(/\s/g, '').split('').map((c) => (c === 'H' ? 0 : 1));
export const pathStr = (p) => p.map((s) => (s === 0 ? 'F' : 'B')).join('');
