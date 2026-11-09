import { describe, it, expect } from 'vitest';
import { defaultParams } from '../src/hmm/model.js';
import { simulate } from '../src/hmm/simulate.js';
import { viterbi } from '../src/hmm/viterbi.js';
import { forwardBackward } from '../src/hmm/forwardBackward.js';
import { precisionReport } from '../src/hmm/precision.js';
import { relClose } from './helpers.js';

const p = defaultParams();

describe('precision methods', () => {
  it('n = 300: all three methods agree', () => {
    const { tosses } = simulate(p, 300, 615);
    const fbs = ['naive', 'rescaled', 'log'].map((m) => forwardBackward(p, tosses, m));
    const vs = ['naive', 'rescaled', 'log'].map((m) => viterbi(p, tosses, m));
    for (const fb of fbs) {
      relClose(fb.logLikelihood, fbs[2].logLikelihood);
      for (let t = 0; t < tosses.length; t++) relClose(fb.posterior[t], fbs[2].posterior[t], 1e-9, 1e-12);
    }
    for (const v of vs) {
      expect(v.path).toEqual(vs[2].path);
      relClose(v.logJoint, vs[2].logJoint);
    }
    const rep = precisionReport(p, tosses);
    expect(rep.methods.naive.firstUnderflow).toBeNull();
    expect(rep.methods.naive.nanPosteriors).toBe(0);
    expect(rep.methods.naive.viterbiDiffers).toBe(0);
  });

  it('n = 3000: naive underflows; rescaled and log agree', () => {
    const { tosses } = simulate(p, 3000, 615);
    const naive = forwardBackward(p, tosses, 'naive');
    const res = forwardBackward(p, tosses, 'rescaled');
    const log = forwardBackward(p, tosses, 'log');
    expect(naive.logLikelihood).toBe(-Infinity);
    naive.posterior.forEach((v) => expect(Number.isNaN(v)).toBe(true));
    relClose(res.logLikelihood, log.logLikelihood);
    for (let t = 0; t < tosses.length; t++) relClose(res.posterior[t], log.posterior[t], 1e-9, 1e-12);

    const vr = viterbi(p, tosses, 'rescaled');
    const vl = viterbi(p, tosses, 'log');
    expect(vr.path).toEqual(vl.path);
    relClose(vr.logJoint, vl.logJoint);

    const rep = precisionReport(p, tosses);
    expect(rep.methods.naive.firstUnderflow).toBeGreaterThan(1);
    expect(rep.methods.naive.firstUnderflow).toBeLessThan(3000);
    expect(rep.methods.naive.nanPosteriors).toBe(3000);
    expect(rep.methods.naive.viterbiDiffers).toBeGreaterThan(0);
    expect(rep.methods.rescaled.nanPosteriors).toBe(0);
    expect(rep.methods.rescaled.viterbiDiffers).toBe(0);
    expect(rep.methods.rescaled.firstUnderflow).toBeUndefined();
  });

  it('n = 2000 (the "Try n = 2000" button) shows naive failing', () => {
    const { tosses } = simulate(p, 2000, 615);
    const rep = precisionReport(p, tosses);
    expect(rep.methods.naive.logLikelihood).toBe(-Infinity);
    expect(rep.methods.naive.nanPosteriors).toBeGreaterThan(0);
    expect(rep.methods.naive.viterbiDiffers).toBeGreaterThan(0);
  });
});
