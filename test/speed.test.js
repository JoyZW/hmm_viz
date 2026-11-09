// "Speeding it up": plain-probability forward / backward values for T T H, the posterior from α·β
// against brute force, and the step decoding that drives the tab.
import { describe, it, expect } from 'vitest';
import { defaultParams, F, B } from '../src/hmm/model.js';
import { enumerate, posteriorByFiltering } from '../src/hmm/enumerate.js';
import { forwardBackward } from '../src/hmm/forwardBackward.js';
import { speedTotal, speedStart, decodeSpeed } from '../src/ui/speed/speedSteps.js';
import { close, seq } from './helpers.js';

const p = defaultParams();

describe('plain α and β for T T H (lecture defaults)', () => {
  const x = seq('TTH');
  const fb = forwardBackward(p, x, 'naive');

  it('α matches the lecture', () => {
    close(fb.alpha[0][F], 0.25, 1e-12);
    close(fb.alpha[0][B], 0.45, 1e-12);
    close(fb.alpha[1][F], 0.16375, 1e-12);
    close(fb.alpha[1][B], 0.33525, 1e-12);
    close(fb.alpha[2][F] + fb.alpha[2][B], 0.138945, 1e-12);
  });

  it('β: 1 at the last toss, then 0.48 / 0.18, then 0.2361 / 0.1776', () => {
    expect(fb.beta[2]).toEqual([1, 1]);
    close(fb.beta[1][F], 0.48, 1e-12); // 0.95·0.5·1 + 0.05·0.1·1
    close(fb.beta[1][B], 0.18, 1e-12); // 0.20·0.5·1 + 0.80·0.1·1
    close(fb.beta[0][F], 0.2361, 1e-12); // 0.95·0.5·0.48 + 0.05·0.9·0.18
    close(fb.beta[0][B], 0.1776, 1e-12); // 0.20·0.5·0.48 + 0.80·0.9·0.18
  });

  it('αₜ(B)·βₜ(B) / Pr(tosses) equals filtering the enumeration table, at every toss', () => {
    const tab = enumerate(p, x);
    const L = fb.alpha[2][F] + fb.alpha[2][B];
    [0.575, 0.434, 0.199].forEach((v, t) => {
      const post = (fb.alpha[t][B] * fb.beta[t][B]) / L;
      close(post, posteriorByFiltering(tab, t).posterior, 1e-12);
      close(post, v, 5e-4);
      // αₜ(F)·βₜ(F) + αₜ(B)·βₜ(B) is the likelihood at every toss
      close(fb.alpha[t][F] * fb.beta[t][F] + fb.alpha[t][B] * fb.beta[t][B], L, 1e-12);
    });
  });
});

describe('Viterbi backtrack and the "what if?" chain', () => {
  it('T T H: path F F F; starting from B at toss 3 and following φ gives B B B, worth δ₃(B) = 0.0259', async () => {
    const { speedValues } = await import('../src/ui/speed/speedTrellis.js');
    const { viterbi } = await import('../src/hmm/viterbi.js');
    const x = seq('TTH');
    const V = speedValues({ fbN: forwardBackward(p, x, 'naive'), vit: viterbi(p, x, 'log') });
    expect(V.path).toEqual([F, F, F]);
    expect(V.alt).toEqual([B, B, B]);
    close(V.delta[2][V.alt[2]], 0.0259, 5e-5);
    expect(V.delta[2][V.alt[2]]).toBeLessThan(V.joint);
  });
});

describe('step decoding', () => {
  it('totals and starting points', () => {
    expect([speedTotal('lik', 3), speedTotal('post', 3), speedTotal('vit', 3)]).toEqual([7, 14, 9]);
    expect([speedStart('lik', 3), speedStart('post', 3), speedStart('vit', 3)]).toEqual([0, 6, 0]);
    expect(speedTotal('post', 1)).toBe(4);
  });

  it('Q1 walks the forward pass node by node, then totals', () => {
    expect(decodeSpeed('lik', 3, 0).phase).toBe('intro');
    const d = decodeSpeed('lik', 3, 4);
    expect(d.phase).toBe('fwd');
    expect(d.curNode).toEqual({ c: 1, s: 1 });
    expect(d.isA(1, 1)).toBe(true);
    expect(d.isA(2, 0)).toBe(false);
    expect(decodeSpeed('lik', 3, 7)).toMatchObject({ phase: 'total', total: true });
  });

  it('Q2 starts with α filled, then β = 1, backward right to left, then one posterior per toss', () => {
    const ready = decodeSpeed('post', 3, 6);
    expect(ready.phase).toBe('ready');
    expect(ready.isA(2, 1)).toBe(true);
    expect(ready.isB(2, 0)).toBe(false);
    const init = decodeSpeed('post', 3, 7);
    expect(init.phase).toBe('binit');
    expect(init.isB(2, 0) && init.isB(2, 1)).toBe(true);
    const b1 = decodeSpeed('post', 3, 8);
    expect(b1).toMatchObject({ phase: 'bwd', curNode: { c: 1, s: 0 } });
    expect(b1.isB(1, 0)).toBe(true);
    expect(b1.isB(1, 1)).toBe(false);
    expect(decodeSpeed('post', 3, 11).curNode).toEqual({ c: 0, s: 1 });
    const p1 = decodeSpeed('post', 3, 12);
    expect(p1).toMatchObject({ phase: 'post', post: 1, curCol: 0 });
    expect(decodeSpeed('post', 3, 14).post).toBe(3);
    // one toss: no backward nodes beyond β = 1
    expect(decodeSpeed('post', 1, 3).phase).toBe('binit');
    expect(decodeSpeed('post', 1, 4)).toMatchObject({ phase: 'post', post: 1 });
  });

  it('Q3 walks the Viterbi pass, then backtracks right to left', () => {
    const d = decodeSpeed('vit', 3, 7);
    expect(d).toMatchObject({ phase: 'bt', backtrack: 1, curCol: 2 });
    expect(d.onPath(2)).toBe(true);
    expect(d.onPath(1)).toBe(false);
    expect(decodeSpeed('vit', 3, 9).backtrack).toBe(3);
  });
});
