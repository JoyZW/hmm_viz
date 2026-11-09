import { describe, it, expect } from 'vitest';
import { defaultParams, paramsFromControls } from '../src/hmm/model.js';
import { enumerate, posteriorByFiltering } from '../src/hmm/enumerate.js';
import { viterbi } from '../src/hmm/viterbi.js';
import { forwardBackward } from '../src/hmm/forwardBackward.js';
import { mulberry32 } from '../src/hmm/simulate.js';
import { relClose } from './helpers.js';

const rng = mulberry32(2026);
const r2 = () => Math.round(rng() * 100) / 100;
const randomSets = Array.from({ length: 5 }, () => paramsFromControls({ pf: r2(), fb: r2(), bf: r2(), hf: r2(), hb: r2() }));
const edgeSets = [
  paramsFromControls({ pf: 1, fb: 0, bf: 0.3, hf: 0.5, hb: 0.1 }),
  paramsFromControls({ pf: 0, fb: 0.4, bf: 1, hf: 0.6, hb: 0 }),
  paramsFromControls({ pf: 0.3, fb: 1, bf: 1, hf: 1, hb: 0.2 }),
  paramsFromControls({ pf: 0.5, fb: 0.5, bf: 0.5, hf: 0.5, hb: 0.5 }), // every path ties
];
const paramSets = [['lecture defaults', defaultParams()], ...randomSets.map((p, i) => [`random ${i}`, p]), ...edgeSets.map((p, i) => [`edge ${i}`, p])];

function* allSequences(n) {
  for (let m = 0; m < 1 << n; m++) yield Array.from({ length: n }, (_, i) => (m >> (n - 1 - i)) & 1);
}

describe.each(paramSets)('brute-force agreement: %s', (_name, p) => {
  it('forward–backward and Viterbi match enumeration for every sequence of length 1–8', () => {
    for (let n = 1; n <= 8; n++) {
      for (const x of allSequences(n)) {
        const tab = enumerate(p, x);
        const L = tab.likelihood;
        const joints = tab.rows.map((r) => r.joint);
        const max = Math.max(...joints);

        for (const method of ['rescaled', 'log']) {
          const fb = forwardBackward(p, x, method);
          if (L === 0) {
            expect(fb.impossible).toBe(true);
            fb.posterior.forEach((v) => expect(Number.isNaN(v)).toBe(false));
            continue;
          }
          expect(fb.impossible).toBe(false);
          relClose(Math.exp(fb.logLikelihood), L);
          for (let t = 0; t < n; t++) {
            relClose(fb.posterior[t], posteriorByFiltering(tab, t).posterior, 1e-9, 1e-12);
          }
        }

        for (const method of ['rescaled', 'log']) {
          const v = viterbi(p, x, method);
          if (max === 0) {
            expect(v.logJoint).toBe(-Infinity);
            continue;
          }
          relClose(Math.exp(v.logJoint), max);
          const tied = joints.filter((j) => j >= max * (1 - 1e-9)).length;
          const rowIdx = v.path.reduce((acc, s) => acc * 2 + s, 0);
          // the returned path is always one of the maximising rows
          expect(joints[rowIdx]).toBeGreaterThanOrEqual(max * (1 - 1e-9));
          if (tied === 1) {
            expect(rowIdx).toBe(joints.indexOf(max));
          }
        }
      }
    }
  });
});

describe('tie-break: prefer F', () => {
  it('all paths tied → Viterbi returns all-F', () => {
    const p = paramsFromControls({ pf: 0.5, fb: 0.5, bf: 0.5, hf: 0.5, hb: 0.5 });
    for (const method of ['naive', 'rescaled', 'log']) {
      expect(viterbi(p, [0, 1, 1, 0, 1], method).path).toEqual([0, 0, 0, 0, 0]);
    }
  });
});
