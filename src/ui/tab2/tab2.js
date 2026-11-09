// Tab 2 — "Long sequences": sliding-window Viterbi trellis, posterior chart, precision comparison.
import { tab2 as T, app as A } from '../../content/text.js';
import { mountSequenceInput, simulateN } from './sequenceInput.js';
import { mountOverviewStrip } from './overviewStrip.js';
import { mountTrellisWindow, windowColumns } from './trellisWindow.js';
import { mountPlayback } from './playback.js';
import { mountPosteriorChart } from './posteriorChart.js';
import { mountPrecisionPanel } from './precisionPanel.js';

/** The column the cursor k points at (0-based). */
export function cursorColumn(k, n) {
  if (k <= 0) return 0;
  if (k <= n) return k - 1;
  return n - (k - n);
}

export function mountTab2(el, store, actions) {
  el.innerHTML = `
    <div class="card" id="t2-seq"></div>
    <div class="impossible card" id="t2-impossible" hidden>${A.impossible}</div>
    <div id="t2-content">
      <section class="card" aria-labelledby="t2-h-trellis">
        <h2 id="t2-h-trellis">${T.trellisHeading}</h2>
        <div id="t2-playback"></div>
        <div id="t2-overview"></div>
        <div id="t2-window"></div>
      </section>
      <section class="card" aria-labelledby="t2-h-post">
        <h2 id="t2-h-post">${T.posteriorHeading}</h2>
        <div id="t2-chart"></div>
      </section>
      <section class="card" aria-labelledby="t2-h-prec">
        <h2 id="t2-h-prec">${T.precisionHeading}</h2>
        <div id="t2-precision"></div>
      </section>
    </div>`;
  const $ = (s) => el.querySelector(s);

  const n = () => store.get().t2seq.tosses.length;
  const setNav = (patch) => actions.setT2Nav(patch);
  const setK = (k, extra = {}) => setNav({ k, center: cursorColumn(k, n()), ...extra });

  mountSequenceInput($('#t2-seq'), store, actions);
  const playback = mountPlayback($('#t2-playback'), store, { setK, setNav });
  const overview = mountOverviewStrip($('#t2-overview'), {
    onMove: (t) => setNav({ center: t }),
    onToggleTrue: (on) => setNav({ showTrue: on }),
  });
  const trellis = mountTrellisWindow($('#t2-window'));
  trellis.lnToggle.addEventListener('change', (e) => setNav({ showLn: e.target.checked }));
  const chart = mountPosteriorChart($('#t2-chart'), {
    onPickToss: (t) => setNav({ center: t }),
    onZoom: (zoom) => setNav({ zoom }),
  });
  const precision = mountPrecisionPanel($('#t2-precision'), { onTryN: (N) => simulateN(store, actions, N) });

  // ── window geometry ──
  let nCols = 25;
  const windowRange = (s) => {
    const N = s.t2seq.tosses.length;
    const count = Math.min(nCols, N);
    const start = Math.max(0, Math.min(N - count, s.t2nav.center - Math.floor(count / 2)));
    return { start, count };
  };

  // ── rendering ──
  let chartKey = {};
  let precisionFor = null;

  const render = (s, force = false) => {
    if (s.tab !== 2) return;
    const impossible = s.r2.fb.impossible;
    $('#t2-impossible').hidden = !impossible;
    $('#t2-content').hidden = impossible;
    if (impossible) return;

    const N = s.t2seq.tosses.length;
    const { k } = s.t2nav;
    nCols = windowColumns($('#t2-window').clientWidth || 1200);
    const win = windowRange(s);

    playback.render(s);
    overview.render({
      n: N,
      argmax: s.r2.argmax,
      path: s.r2.vit.path,
      truePath: s.t2seq.truePath,
      showTrue: s.t2nav.showTrue,
      fwdCount: Math.min(k, N),
      btFrom: k > N ? N - (k - N) : N,
      winStart: win.start,
      winCount: win.count,
    });
    trellis.render({
      params: s.params,
      tosses: s.t2seq.tosses,
      vit: s.r2.vit,
      k,
      winStart: win.start,
      winCount: win.count,
      showLn: s.t2nav.showLn,
      truePath: s.t2seq.truePath,
    });

    const showViterbi = k >= 2 * N;
    const width = $('#t2-chart').clientWidth;
    if (force || chartKey.r2 !== s.r2 || chartKey.zoom !== s.t2nav.zoom || chartKey.showViterbi !== showViterbi || chartKey.width !== width) {
      chartKey = { r2: s.r2, zoom: s.t2nav.zoom, showViterbi, width };
      chart.updateBand([win.start + 1, win.start + win.count]);
      chart.render({
        tosses: s.t2seq.tosses,
        posterior: s.r2.fb.posterior,
        path: s.r2.vit.path,
        showViterbi,
        zoom: s.t2nav.zoom,
        truePath: s.t2seq.truePath,
      });
    } else {
      chart.updateBand([win.start + 1, win.start + win.count]);
    }

    if (force || precisionFor !== s.r2) {
      precisionFor = s.r2;
      precision.render(s.r2.report);
    }
  };

  store.subscribe((s, prev) => {
    if (s.tab === 2 && prev.tab !== 2) render(s, true);
    else if (s.t2nav !== prev.t2nav || s.r2 !== prev.r2 || s.t2seq !== prev.t2seq) render(s);
  });
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => render(store.get(), true), 80);
  });
  render(store.get(), true);

  return { keys: playback.keys };
}
