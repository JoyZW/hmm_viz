// The two long-sequence tabs. They share one toss sequence (typed or simulated, 1–5000 tosses):
//   "Posterior vs Viterbi path" — which coin at each toss, with a reading guide;
//   "Long sequences"            — the precision comparison (why naive breaks, what the fixes store).
import { tab2 as T, app as A } from '../../content/text.js';
import { fmtProb } from '../../hmm/format.js';
import { mountSequenceInput, simulateN } from './sequenceInput.js';
import { mountPosteriorChart } from './posteriorChart.js';
import { mountPrecisionPanel } from './precisionPanel.js';

/** Redraw on entering the tab, on resize, and when `changed(s, prev)` says the inputs moved. */
function wireRender(store, tabId, render, changed) {
  store.subscribe((s, prev) => {
    if (s.tab !== tabId) return;
    if (prev.tab !== tabId) render(s, true);
    else if (changed(s, prev)) render(s);
  });
  let timer = null;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => store.get().tab === tabId && render(store.get(), true), 80);
  });
  if (store.get().tab === tabId) render(store.get(), true);
}

export function mountCompareTab(el, store, actions) {
  el.innerHTML = `
    <div class="card" id="cmp-seq"></div>
    <div class="impossible card" id="cmp-impossible" hidden>${A.impossible}</div>
    <section class="card" id="cmp-content" aria-labelledby="cmp-h">
      <h2 id="cmp-h">${T.posteriorHeading}</h2>
      <div class="read-guide" id="cmp-guide"></div>
      <div id="cmp-chart"></div>
    </section>`;
  const $ = (s) => el.querySelector(s);
  mountSequenceInput($('#cmp-seq'), store, actions, { prefix: 'cmp', intro: T.compareIntro });
  const chart = mountPosteriorChart($('#cmp-chart'), { onZoom: (zoom) => actions.setT2Nav({ zoom }) });

  let key = {};
  const render = (s, force = false) => {
    const impossible = s.r2.fb.impossible;
    $('#cmp-impossible').hidden = !impossible;
    $('#cmp-content').hidden = impossible;
    if (impossible) return;
    const c = s.controls;
    $('#cmp-guide').innerHTML = T.readGuide({
      hf: fmtProb(c.hf, 1),
      hb: fmtProb(c.hb, 1),
      fb: fmtProb(c.fb, 2),
      bf: fmtProb(c.bf, 2),
      headsLower: c.hb < c.hf,
      headsEqual: c.hb === c.hf,
    });
    const width = $('#cmp-chart').clientWidth;
    if (force || key.r2 !== s.r2 || key.zoom !== s.t2nav.zoom || key.width !== width) {
      key = { r2: s.r2, zoom: s.t2nav.zoom, width };
      chart.render({ tosses: s.t2seq.tosses, posterior: s.r2.fb.posterior, path: s.r2.vit.path, zoom: s.t2nav.zoom, truePath: s.t2seq.truePath });
    }
  };
  wireRender(store, 'compare', render, (s, prev) => s.t2nav !== prev.t2nav || s.r2 !== prev.r2 || s.controls !== prev.controls);
  return { keys: null };
}

export function mountLongTab(el, store, actions) {
  el.innerHTML = `
    <div class="card" id="long-seq"></div>
    <div class="impossible card" id="long-impossible" hidden>${A.impossible}</div>
    <section class="card" id="long-content" aria-labelledby="long-h">
      <h2 id="long-h">${T.precisionHeading}</h2>
      <div id="long-precision"></div>
    </section>`;
  const $ = (s) => el.querySelector(s);
  mountSequenceInput($('#long-seq'), store, actions, { prefix: 'long', intro: T.longIntro });
  const precision = mountPrecisionPanel($('#long-precision'), { onTryN: (N) => simulateN(store, actions, N) });

  let drawn = {};
  const render = (s, force = false) => {
    const impossible = s.r2.fb.impossible;
    $('#long-impossible').hidden = !impossible;
    $('#long-content').hidden = impossible;
    if (impossible) return;
    const width = $('#long-precision').clientWidth;
    if (force || drawn.r2 !== s.r2 || drawn.width !== width) {
      drawn = { r2: s.r2, width };
      precision.render(s.r2.report, s.t2seq.tosses);
    }
  };
  wireRender(store, 'long', render, (s, prev) => s.r2 !== prev.r2);
  return { keys: null };
}
