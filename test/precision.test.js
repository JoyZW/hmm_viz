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

describe('precision chart: projected crossing', () => {
  it('the projection from 500 tosses lands near where naive really underflows', async () => {
    const { projectCrossing, smallestStored } = await import('../src/ui/tab2/precisionChart.js');
    const { simulate } = await import('../src/hmm/simulate.js');
    const { precisionReport } = await import('../src/hmm/precision.js');
    const { defaultParams } = await import('../src/hmm/model.js');
    const p = defaultParams();
    const long = simulate(p, 2000, 615).tosses;
    const short = long.slice(0, 500);
    const rShort = precisionReport(p, short);
    expect(rShort.methods.naive.firstUnderflow).toBeNull();
    const proj = projectCrossing(smallestStored(rShort).map((v) => v.ln / Math.LN10));
    const actual = precisionReport(p, long).methods.naive.firstUnderflow;
    expect(actual).not.toBeNull();
    // the projection passes 10⁻³⁰⁸ before the stored value is exactly 0, and is within 20% of it
    expect(proj.normal).toBeLessThan(proj.zero);
    expect(Math.abs(proj.zero - actual) / actual).toBeLessThan(0.2);
  });

  it("the chart's red line first stores 0 exactly at the table's first underflow", async () => {
    const { smallestStored } = await import('../src/ui/tab2/precisionChart.js');
    const { simulate } = await import('../src/hmm/simulate.js');
    const { precisionReport } = await import('../src/hmm/precision.js');
    const { defaultParams } = await import('../src/hmm/model.js');
    const r = precisionReport(defaultParams(), simulate(defaultParams(), 2000, 615).tosses);
    const firstZero = smallestStored(r).findIndex((v) => v && v.naive === 0) + 1;
    expect(firstZero).toBe(r.methods.naive.firstUnderflow);
  });
});
