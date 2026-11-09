// Tab 2 — "Long sequences": "which coin at each toss?" (posterior vs Viterbi path) with a guide to
// reading it, then the precision comparison. The step-by-step trellis lives in "Speeding it up".
import { tab2 as T, app as A } from '../../content/text.js';
import { fmtProb } from '../../hmm/format.js';
import { mountSequenceInput, simulateN } from './sequenceInput.js';
import { mountPosteriorChart } from './posteriorChart.js';
import { mountPrecisionPanel } from './precisionPanel.js';

export function mountTab2(el, store, actions) {
  el.innerHTML = `
    <div class="card" id="t2-seq"></div>
    <div class="impossible card" id="t2-impossible" hidden>${A.impossible}</div>
    <div id="t2-content">
      <section class="card" aria-labelledby="t2-h-post">
        <h2 id="t2-h-post">${T.posteriorHeading}</h2>
        <div class="read-guide" id="t2-guide"></div>
        <div id="t2-chart"></div>
      </section>
      <section class="card" aria-labelledby="t2-h-prec">
        <h2 id="t2-h-prec">${T.precisionHeading}</h2>
        <div id="t2-precision"></div>
      </section>
    </div>`;
  const $ = (s) => el.querySelector(s);

  mountSequenceInput($('#t2-seq'), store, actions);
  const chart = mountPosteriorChart($('#t2-chart'), { onZoom: (zoom) => actions.setT2Nav({ zoom }) });
  const precision = mountPrecisionPanel($('#t2-precision'), { onTryN: (N) => simulateN(store, actions, N) });

  // ── rendering ──
  let chartKey = {};
  let precisionFor = null;

  const render = (s, force = false) => {
    if (s.tab !== 'long') return;
    const impossible = s.r2.fb.impossible;
    $('#t2-impossible').hidden = !impossible;
    $('#t2-content').hidden = impossible;
    if (impossible) return;

    const c = s.controls;
    $('#t2-guide').innerHTML = T.readGuide({
      hf: fmtProb(c.hf, 1),
      hb: fmtProb(c.hb, 1),
      fb: fmtProb(c.fb, 2),
      bf: fmtProb(c.bf, 2),
      headsLower: c.hb < c.hf,
      headsEqual: c.hb === c.hf,
    });

    const width = $('#t2-chart').clientWidth;
    if (force || chartKey.r2 !== s.r2 || chartKey.zoom !== s.t2nav.zoom || chartKey.width !== width) {
      chartKey = { r2: s.r2, zoom: s.t2nav.zoom, width };
      chart.render({
        tosses: s.t2seq.tosses,
        posterior: s.r2.fb.posterior,
        path: s.r2.vit.path,
        zoom: s.t2nav.zoom,
        truePath: s.t2seq.truePath,
      });
    }

    if (force || precisionFor !== s.r2) {
      precisionFor = s.r2;
      precision.render(s.r2.report);
    }
  };

  store.subscribe((s, prev) => {
    if (s.tab === 'long' && prev.tab !== 'long') render(s, true);
    else if (s.t2nav !== prev.t2nav || s.r2 !== prev.r2 || s.t2seq !== prev.t2seq || s.controls !== prev.controls) render(s);
  });
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => render(store.get(), true), 80);
  });
  render(store.get(), true);

  return { keys: null };
}
