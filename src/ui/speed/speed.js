// "Speeding it up" — the three questions answered by the trellis passes instead of the list of
// coin paths. Same frame as "How HMMs work": step bar + caption, one trellis, then the values
// table beside the answer card. Shares the toss sequence with "How HMMs work".
import { speed as T, tab1 as T1, app as A, parseError } from '../../content/text.js';
import { parseTosses, tossesToString, TAB1_MAX } from '../../hmm/parse.js';
import { SPEED_QS } from '../../state/url.js';
import { speedTotal, speedStart, decodeSpeed } from './speedSteps.js';
import { speedValues, renderSpeedTrellis } from './speedTrellis.js';
import { renderSpeedTable, renderSpeedCard } from './speedPanels.js';

export function mountSpeed(el, store, actions) {
  el.innerHTML = `
    <div class="stepper t1-bar" role="group" aria-label="Step controls">
      <label for="sp-input" class="bar-label">${T1.inputLabel}</label>
      <input type="text" id="sp-input" class="toss-input" maxlength="40" autocomplete="off" spellcheck="false"
        title="${T1.inputHint}" aria-describedby="sp-error" />
      <span class="bar-sep" aria-hidden="true"></span>
      <button type="button" class="btn" id="sp-back" title="${T1.stepperHint}">◀ Back</button>
      <button type="button" class="btn primary" id="sp-next" title="${T1.stepperHint}">Next ▶</button>
      <button type="button" class="btn" id="sp-reset">Reset</button>
      <button type="button" class="btn" id="sp-fill">${T1.fillAll}</button>
      <span class="bar-sep" aria-hidden="true"></span>
      <div class="seg" role="radiogroup" aria-label="${T.qToggleLabel}">
        ${SPEED_QS.map((q, i) => `<button type="button" class="seg-btn q-toggle" data-q="${q}" role="radio"><span class="qt-q">${T.qToggle[i]}</span><span class="qt-m">${T.qMethod[i]}</span></button>`).join('')}
      </div>
      <span class="progress" id="sp-progress"></span>
      <span class="error" id="sp-error" role="alert"></span>
    </div>
    <div class="impossible card" id="sp-impossible" hidden>${A.impossible}</div>
    <div id="sp-content" class="t1-content">
      <p class="caption t1-caption" id="sp-cap" aria-live="polite"></p>
      <section class="card t1-trellis-card" aria-label="${T.trellisAria}">
        <div class="trellis-wrap"><svg id="sp-trellis" class="trellis-svg" role="img" aria-label="${T.trellisAria}"></svg></div>
        <div class="t1-under-row">
          <div id="sp-eqs" class="equations compact" aria-live="polite"></div>
          <p class="pt-legend" id="sp-legend"></p>
        </div>
      </section>
      <div class="t1-lower">
        <section class="card sp-table-card"><div id="sp-table"></div></section>
        <section class="card t1-q-card"><div id="sp-card"></div></section>
      </div>
    </div>`;

  const $ = (sel) => el.querySelector(sel);
  const input = $('#sp-input');
  const errEl = $('#sp-error');

  // ── shared toss sequence ──
  input.addEventListener('input', () => {
    const r = parseTosses(input.value, { max: TAB1_MAX });
    if (!r.ok) {
      errEl.textContent = parseError(r);
      input.classList.add('invalid');
      return;
    }
    errEl.textContent = '';
    input.classList.remove('invalid');
    if (tossesToString(r.tosses) !== tossesToString(store.get().t1.tosses)) actions.setT1Tosses(r.tosses);
  });
  input.addEventListener('blur', () => {
    if (!input.classList.contains('invalid')) input.value = tossesToString(store.get().t1.tosses, ' ');
  });

  // ── stepping: each question keeps its own step ──
  const n = () => store.get().t1.tosses.length;
  const nav = () => store.get().speedNav;
  const isImpossible = () => store.get().r1.fb.impossible;
  const setK = (k) => {
    const v = nav();
    actions.setSpeedNav({ k: { ...v.k, [v.q]: Math.max(0, Math.min(speedTotal(v.q, n()), k)) } });
  };
  const next = () => !isImpossible() && setK(nav().k[nav().q] + 1);
  const back = () => !isImpossible() && setK(nav().k[nav().q] - 1);

  $('#sp-next').addEventListener('click', next);
  $('#sp-back').addEventListener('click', back);
  $('#sp-reset').addEventListener('click', () => setK(speedStart(nav().q, n())));
  $('#sp-fill').addEventListener('click', () => setK(speedTotal(nav().q, n())));
  el.querySelectorAll('.seg-btn').forEach((b) => b.addEventListener('click', () => actions.setSpeedNav({ q: b.dataset.q })));
  $('#sp-card').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-t]');
    if (b) actions.setSpeedNav({ qT: Number(b.dataset.t) });
  });

  // ── render ──
  const render = (s) => {
    const { tosses } = s.t1;
    const N = tosses.length;
    const { q, qT } = s.speedNav;
    const k = s.speedNav.k[q];

    if (document.activeElement !== input) {
      input.value = tossesToString(tosses, ' ');
      input.classList.remove('invalid');
      errEl.textContent = '';
    }
    const impossible = s.r1.fb.impossible;
    $('#sp-impossible').hidden = !impossible;
    $('#sp-content').hidden = impossible;
    ['#sp-back', '#sp-next', '#sp-reset', '#sp-fill', '#sp-progress'].forEach((id) => ($(id).hidden = impossible));
    if (impossible) return;

    const total = speedTotal(q, N);
    $('#sp-back').disabled = k === 0;
    $('#sp-next').disabled = k >= total;
    $('#sp-fill').disabled = k >= total;
    el.querySelectorAll('.seg-btn').forEach((b) => {
      const on = b.dataset.q === q;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    });
    $('#sp-progress').textContent = `step ${k} / ${total}`; // the toggle already names the question
    $('#sp-legend').innerHTML = T.legend[q];

    const V = speedValues(s.r1);
    const d = decodeSpeed(q, N, k);
    $('#sp-cap').textContent = renderSpeedTrellis({ svgEl: $('#sp-trellis'), eqEl: $('#sp-eqs'), params: s.params, tosses, V, q, d });
    renderSpeedTable($('#sp-table'), { q, tosses, V, d, qT });
    renderSpeedCard($('#sp-card'), { q, tosses, V, d, qT, table: s.r1.table });
  };

  store.subscribe((s, prev) => {
    if (s.tab !== 'speed') return;
    if (prev.tab !== 'speed' || s.t1 !== prev.t1 || s.r1 !== prev.r1 || s.speedNav !== prev.speedNav || s.params !== prev.params) render(s);
  });
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => store.get().tab === 'speed' && render(store.get()), 80);
  });
  if (store.get().tab === 'speed') render(store.get());

  return { keys: { next, back, space: next } };
}
