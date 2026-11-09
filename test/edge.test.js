import { describe, it, expect } from 'vitest';
import { defaultParams, paramsFromControls, validateParams } from '../src/hmm/model.js';
import { viterbi } from '../src/hmm/viterbi.js';
import { forwardBackward, logSumExp } from '../src/hmm/forwardBackward.js';
import { enumerate } from '../src/hmm/enumerate.js';
import { parseTosses, tossesToString, TAB1_MAX, TAB2_MAX } from '../src/hmm/parse.js';
import { simulate } from '../src/hmm/simulate.js';
import { sciFromLog, sciPartsFromLog, sig3, fixed4, fmtProb, fmtLn } from '../src/hmm/format.js';
import { close, relClose } from './helpers.js';

const p = defaultParams();

describe('edge cases', () => {
  it('n = 1', () => {
    for (const m of ['naive', 'rescaled', 'log']) {
      const v = viterbi(p, [1], m);
      expect(v.path).toEqual([1]); // 0.45 > 0.25
      close(Math.exp(v.logJoint), 0.45, 1e-12);
      const fb = forwardBackward(p, [1], m);
      close(Math.exp(fb.logLikelihood), 0.7, 1e-12);
      close(fb.posterior[0], 0.45 / 0.7, 1e-12);
    }
  });

  it('impossible sequence → flag, no NaN in stable methods', () => {
    const q = paramsFromControls({ pf: 0.5, fb: 0.05, bf: 0.2, hf: 0, hb: 0 });
    const x = [1, 0, 1];
    for (const m of ['rescaled', 'log']) {
      const fb = forwardBackward(q, x, m);
      expect(fb.impossible).toBe(true);
      expect(fb.logLikelihood).toBe(-Infinity);
      fb.posterior.forEach((v) => expect(Number.isNaN(v)).toBe(false));
      const v = viterbi(q, x, m);
      expect(v.logJoint).toBe(-Infinity);
      v.columns.forEach((c) => c.logDelta.forEach((d) => expect(Number.isNaN(d)).toBe(false)));
    }
  });

  it('deterministic transitions (1.0) handle −∞ correctly', () => {
    const q = paramsFromControls({ pf: 1, fb: 0, bf: 0, hf: 0.5, hb: 0.1 });
    const x = [1, 1, 0, 1, 1];
    const tab = enumerate(q, x);
    for (const m of ['rescaled', 'log']) {
      const fb = forwardBackward(q, x, m);
      expect(fb.impossible).toBe(false);
      relClose(Math.exp(fb.logLikelihood), tab.likelihood);
      fb.posterior.forEach((v) => expect(v).toBe(0));
      const v = viterbi(q, x, m);
      expect(v.path).toEqual([0, 0, 0, 0, 0]);
      relClose(Math.exp(v.logJoint), 0.5 ** 5);
      v.columns.forEach((c) => {
        expect(c.logDelta[1]).toBe(-Infinity);
        c.logDelta.forEach((d) => expect(Number.isNaN(d)).toBe(false));
      });
    }
  });

  it('logSumExp of −∞ inputs', () => {
    expect(logSumExp(-Infinity, -Infinity)).toBe(-Infinity);
    expect(logSumExp(-Infinity, Math.log(0.3))).toBeCloseTo(Math.log(0.3), 14);
    expect(logSumExp(Math.log(0.2), Math.log(0.3))).toBeCloseTo(Math.log(0.5), 14);
  });

  it('validateParams', () => {
    expect(validateParams(p)).toBe(true);
    expect(validateParams({ ...p, start: [0.4, 0.4] })).toBe(false);
  });
});

describe('parser', () => {
  it('accepts mixed case, whitespace and commas', () => {
    const r = parseTosses(' t,T h\n', { max: TAB1_MAX });
    expect(r).toEqual({ ok: true, tosses: [1, 1, 0] });
    expect(tossesToString(r.tosses)).toBe('TTH');
  });
  it('rejects other characters with position', () => {
    expect(parseTosses('TTXH')).toEqual({ ok: false, code: 'char', char: 'X', position: 3 });
    expect(parseTosses('T, 1')).toMatchObject({ ok: false, char: '1', position: 4 });
  });
  it('enforces length bounds per tab', () => {
    expect(parseTosses('', { max: TAB1_MAX })).toEqual({ ok: false, code: 'empty' });
    expect(parseTosses(' , ', { max: TAB1_MAX })).toEqual({ ok: false, code: 'empty' });
    expect(parseTosses('TTHHT', { max: TAB1_MAX })).toMatchObject({ ok: false, code: 'tooLong', length: 5, max: 4 });
    expect(parseTosses('T'.repeat(TAB2_MAX), { max: TAB2_MAX }).ok).toBe(true);
    expect(parseTosses('T'.repeat(TAB2_MAX + 1), { max: TAB2_MAX }).ok).toBe(false);
  });
});

describe('simulator', () => {
  it('same seed ⇒ identical output', () => {
    expect(simulate(p, 500, 615)).toEqual(simulate(p, 500, 615));
    expect(simulate(p, 500, 615).tosses).not.toEqual(simulate(p, 500, 616).tosses);
  });
  it('empirical emission frequencies match the parameters', () => {
    const { tosses, truePath } = simulate(p, 200000, 7);
    const count = [
      [0, 0],
      [0, 0],
    ];
    tosses.forEach((x, t) => count[truePath[t]][x]++);
    for (const s of [0, 1]) {
      const pH = count[s][0] / (count[s][0] + count[s][1]);
      close(pH, p.emit[s][0], 0.01);
    }
    // stationary share of Biased = 0.05 / (0.05 + 0.2) = 0.2
    close(truePath.filter((s) => s === 1).length / truePath.length, 0.2, 0.02);
  });
});

describe('formatter', () => {
  it('3 significant figures for Tab 1', () => {
    expect(sig3(0.11875)).toBe('0.119');
    expect(sig3(0.0564)).toBe('0.0564');
    expect(sig3(0.25)).toBe('0.25');
    expect(sig3(0.32400000000000007)).toBe('0.324');
    expect(sig3(0)).toBe('0');
  });
  it('fixed4 and fmtProb', () => {
    expect(fixed4(0.13895)).toBe('0.1389');
    expect(fixed4(0.000625)).toBe('0.0006');
    expect(fmtProb(0.2, 2)).toBe('0.20');
    expect(fmtProb(0.95, 2)).toBe('0.95');
    expect(fmtProb(0.5, 1)).toBe('0.5');
    expect(fmtProb(1, 1)).toBe('1.0');
  });
  it('sci-notation from log for very negative logs', () => {
    const ln = -1842.3;
    const parts = sciPartsFromLog(ln);
    const l10 = ln / Math.LN10;
    expect(parts.exponent).toBe(-801);
    expect(parts.exponent).toBe(Math.floor(l10));
    close(Number(parts.mantissa), Math.pow(10, l10 + 801), 0.05);
    expect(sciFromLog(ln)).toBe('7.9 × 10⁻⁸⁰¹');
    expect(sciFromLog(Math.log(2.7865e-7))).toBe('2.8 × 10⁻⁷');
    expect(sciFromLog(Math.log(9.99e-5))).toBe('1.0 × 10⁻⁴');
    expect(sciFromLog(-Infinity)).toBe('0');
    expect(fmtLn(-1842.3)).toBe('−1842.3');
    expect(fmtLn(-Infinity)).toBe('−∞');
  });
});
