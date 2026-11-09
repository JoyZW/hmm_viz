import { describe, it, expect } from 'vitest';
import { defaultParams, F, B } from '../src/hmm/model.js';
import { enumerate, posteriorByFiltering, argmaxRow } from '../src/hmm/enumerate.js';
import { viterbi } from '../src/hmm/viterbi.js';
import { forwardBackward } from '../src/hmm/forwardBackward.js';
import { close, seq, pathStr } from './helpers.js';

const p = defaultParams();

describe('lecture fixture: T T H', () => {
  const x = seq('TTH');

  for (const method of ['naive', 'rescaled', 'log']) {
    it(`Viterbi (${method}): path FFF, joint 0.0564, table values`, () => {
      const v = viterbi(p, x, method);
      expect(pathStr(v.path)).toBe('FFF');
      close(Math.exp(v.logJoint), 0.0564, 5e-5);
      const d = v.columns.map((c) => c.logDelta.map(Math.exp));
      close(d[0][F], 0.25, 5e-6);
      close(d[0][B], 0.45, 5e-6);
      close(d[1][F], 0.11875, 5e-7);
      close(d[1][B], 0.324, 5e-4);
      close(d[2][F], 0.0564, 5e-5);
      close(d[2][B], 0.0259, 5e-5);
      expect(v.columns[2].phi[F]).toBe(F);
      expect(v.columns[2].phi[B]).toBe(B);
    });

    it(`Forward (${method}): α₂, likelihood, posterior at toss 2`, () => {
      const fb = forwardBackward(p, x, method);
      close(Math.exp(fb.logAlpha[1][F]), 0.16375, 1e-9);
      close(Math.exp(fb.logAlpha[1][B]), 0.33525, 1e-9);
      close(Math.exp(fb.logLikelihood), 0.1389, 5e-5); // lecture value (exact: 0.138945)
      close(Math.exp(fb.logLikelihood), 0.138945, 1e-12);
      close(fb.posterior[1], 0.434, 5e-4);
    });
  }

  it('enumeration table joint probabilities in order FFF…BBB', () => {
    const tab = enumerate(p, x);
    const expected = [0.0564, 0.0006, 0.0011, 0.0009, 0.0214, 0.0002, 0.0324, 0.0259];
    expect(tab.rows.map((r) => pathStr(r.states))).toEqual(['FFF', 'FFB', 'FBF', 'FBB', 'BFF', 'BFB', 'BBF', 'BBB']);
    tab.rows.forEach((r, i) => close(r.joint, expected[i], 5e-5));
    close(tab.likelihood, 0.1389, 5e-5);
    close(posteriorByFiltering(tab, 1).posterior, 0.434, 5e-4);
    expect(argmaxRow(tab)).toBe(0);
    // factors: toss 1 uses start · emit
    expect(tab.rows[4].factors[0]).toMatchObject({ trans: 0.5, emit: 0.9, isStart: true });
    expect(tab.rows[6].factors[1].trans).toBeCloseTo(0.8, 12);
  });
});

describe('lecture fixture: 20 tosses', () => {
  const x = seq('T H T H T T H T T T T T T H T T T T T T');
  const post = [0.405, 0.188, 0.193, 0.142, 0.239, 0.272, 0.25, 0.459, 0.581, 0.647, 0.67, 0.656, 0.603, 0.497, 0.627, 0.702, 0.736, 0.74, 0.714, 0.652];

  it('Viterbi path switches at toss 8; joint ≈ 2.7865e-7', () => {
    for (const method of ['naive', 'rescaled', 'log']) {
      const v = viterbi(p, x, method);
      expect(pathStr(v.path)).toBe('FFFFFFFBBBBBBBBBBBBB');
      close(Math.exp(v.logJoint) / 2.7865e-7, 1, 5e-4);
    }
  });

  it('posteriors match the lecture to 3 d.p.', () => {
    for (const method of ['naive', 'rescaled', 'log']) {
      const fb = forwardBackward(p, x, method);
      post.forEach((v, t) => close(fb.posterior[t], v, 5e-4));
    }
  });

  it('disagreement tosses are exactly {8, 14}', () => {
    const v = viterbi(p, x, 'log');
    const fb = forwardBackward(p, x, 'rescaled');
    const dis = [];
    for (let t = 0; t < x.length; t++) {
      const q = fb.posterior[t];
      if (q === 0.5) continue;
      const mostLikely = q > 0.5 ? B : F;
      if (mostLikely !== v.path[t]) dis.push(t + 1);
    }
    expect(dis).toEqual([8, 14]);
  });
});
