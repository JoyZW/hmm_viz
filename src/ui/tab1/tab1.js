// Tab 1 — "How HMMs work": enumeration table → the three questions → trellis by hand.
import { tab1 as T, app as A, parseError } from '../../content/text.js';
import { parseTosses, tossesToString, TAB1_MAX } from '../../hmm/parse.js';
import { argmaxRow } from '../../hmm/enumerate.js';
import { fixed4, fmtProb } from '../../hmm/format.js';
import { STATE_LETTERS, TOSS_LETTERS } from '../../hmm/model.js';
import { renderEnumerationTable } from './enumerationTable.js';
import { mountQuestions, renderQuestions, questionResult } from './questions.js';
import { renderTrellisStage, stage3Steps, decodeStep } from './trellisByHand.js';

export function mountTab1(el, store, actions) {
  el.innerHTML = `
    <div class="card t1-head">
      <p class="intro">${T.intro}</p>
      <div class="field-row">
        <label for="t1-input">${T.inputLabel}</label>
        <input type="text" id="t1-input" class="toss-input" maxlength="40" autocomplete="off" spellcheck="false" aria-describedby="t1-error" />
        <span class="error" id="t1-error" role="alert"></span>
      </div>
    </div>
    <div class="impossible card" id="t1-impossible" hidden>${A.impossible}</div>
    <div id="t1-content">
      <div class="stepper" role="group" aria-label="Step controls">
        <button type="button" class="btn" id="t1-back">◀ Back</button>
        <button type="button" class="btn primary" id="t1-next">Next ▶</button>
        <button type="button" class="btn" id="t1-reset">Reset</button>
        <span class="progress" id="t1-progress"></span>
        <span class="hint">${T.stepperHint}</span>
      </div>

      <section class="card stage" id="t1-stage1" aria-labelledby="t1-h1">
        <div class="stage-head">
          <h2 id="t1-h1">${T.stageTitles[0]}</h2>
          <button type="button" class="btn small" id="t1-fill">${T.fillAll}</button>
        </div>
        <div id="t1-table" class="table-wrap"></div>
        <p class="caption" id="t1-cap1" aria-live="polite"></p>
      </section>

      <section class="card stage" id="t1-stage2" aria-labelledby="t1-h2" hidden>
        <div class="stage-head"><h2 id="t1-h2">${T.stageTitles[1]}</h2></div>
        <div id="t1-questions"></div>
        <p class="caption" id="t1-cap2" aria-live="polite"></p>
      </section>

      <section class="card stage" id="t1-stage3" aria-labelledby="t1-h3" hidden>
        <div class="stage-head">
          <h2 id="t1-h3">${T.stageTitles[2]}</h2>
          <div class="seg" role="radiogroup" aria-label="${T.modeLabel}">
            <span class="label">${T.modeLabel}</span>
            <button type="button" class="seg-btn" data-mode="max" role="radio">${T.modeMax}</button>
            <button type="button" class="seg-btn" data-mode="sum" role="radio">${T.modeSum}</button>
          </div>
        </div>
        <h3 class="trellis-title" id="t1-trellis-title"></h3>
        <div class="trellis-wrap"><svg id="t1-trellis" class="trellis-svg" role="img" aria-label="Trellis"></svg></div>
        <div class="equations" id="t1-eqs" aria-live="polite"></div>
        <p class="caption" id="t1-cap3" aria-live="polite"></p>
      </section>
    </div>`;

  const $ = (sel) => el.querySelector(sel);
  const input = $('#t1-input');
  const errEl = $('#t1-error');

  // ── sequence input ──
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

  // ── navigation ──
  const nRows = () => 1 << store.get().t1.tosses.length;
  const nav = () => store.get().t1nav;
  const isImpossible = () => store.get().r1.fb.impossible;
  const scrollTo = (id) => requestAnimationFrame(() => $(id).scrollIntoView({ behavior: 'smooth', block: 'nearest' }));

  const next = () => {
    if (isImpossible()) return;
    const v = nav();
    const n = store.get().t1.tosses.length;
    if (v.stage === 1) {
      if (v.s1 < nRows() + 1) actions.setT1Nav({ s1: v.s1 + 1 });
      else {
        actions.setT1Nav({ stage: 2, question: null });
        scrollTo('#t1-stage2');
      }
    } else if (v.stage === 2) {
      actions.setT1Nav({ stage: 3, s3: 0 });
      scrollTo('#t1-stage3');
    } else if (v.s3 < stage3Steps(v.mode, n)) actions.setT1Nav({ s3: v.s3 + 1 });
  };
  const back = () => {
    if (isImpossible()) return;
    const v = nav();
    if (v.stage === 3) {
      if (v.s3 > 0) actions.setT1Nav({ s3: v.s3 - 1 });
      else actions.setT1Nav({ stage: 2 });
    } else if (v.stage === 2) actions.setT1Nav({ stage: 1, s1: nRows() + 1, question: null });
    else if (v.s1 > 0) actions.setT1Nav({ s1: v.s1 - 1 });
  };
  const reset = () => actions.setT1Nav({ stage: 1, s1: 0, question: null, s3: 0 });

  $('#t1-next').addEventListener('click', next);
  $('#t1-back').addEventListener('click', back);
  $('#t1-reset').addEventListener('click', reset);
  $('#t1-fill').addEventListener('click', () => {
    if (nav().stage === 1) actions.setT1Nav({ s1: nRows() + 1 });
  });
  el.querySelectorAll('.seg-btn').forEach((b) =>
    b.addEventListener('click', () => {
      if (nav().mode !== b.dataset.mode) actions.setT1Nav({ mode: b.dataset.mode, s3: 0 });
    }),
  );

  mountQuestions($('#t1-questions'), {
    onPick: (q) => actions.setT1Nav({ question: q }),
    onToss: (t) => actions.setT1Nav({ qT: t, question: 'post' }),
  });

  // ── render ──
  const render = (s) => {
    const { tosses } = s.t1;
    const { table, vit, fb } = s.r1;
    const v = s.t1nav;
    const n = tosses.length;
    const R = 1 << n;

    if (document.activeElement !== input) {
      input.value = tossesToString(tosses, ' ');
      input.classList.remove('invalid');
      errEl.textContent = '';
    }

    const impossible = fb.impossible;
    $('#t1-impossible').hidden = !impossible;
    $('#t1-content').hidden = impossible;
    if (impossible) return;

    // stage visibility
    $('#t1-stage2').hidden = v.stage < 2;
    $('#t1-stage3').hidden = v.stage < 3;
    $('#t1-fill').disabled = v.stage !== 1 || v.s1 >= R + 1;
    $('#t1-back').disabled = v.stage === 1 && v.s1 === 0;
    $('#t1-next').disabled = v.stage === 3 && v.s3 >= stage3Steps(v.mode, n);
    el.querySelectorAll('.seg-btn').forEach((b) => {
      const on = b.dataset.mode === v.mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    });

    // progress label
    let prog;
    if (v.stage === 1) prog = `Stage 1 of 3 · ${Math.min(v.s1, R)} / ${R} rows${v.s1 > R ? ' + Sum' : ''}`;
    else if (v.stage === 2) prog = 'Stage 2 of 3';
    else prog = `Stage 3 of 3 · step ${v.s3} / ${stage3Steps(v.mode, n)}`;
    $('#t1-progress').textContent = prog;

    // stage 1 table
    const filled = v.stage === 1 ? Math.min(v.s1, R) : R;
    const sumFilled = v.stage > 1 || v.s1 > R;
    const complete = sumFilled;
    let highlight = {};
    if (v.stage === 2) highlight = questionResult({ question: v.question, qT: v.qT, table, tosses }).highlight;
    if (v.stage === 3) {
      const d = decodeStep(v.mode, n, v.s3);
      if (v.mode === 'max' && d.backtrack === n) highlight = { max: argmaxRow(table) };
      if (d.total) highlight = { sum: true };
    }
    renderEnumerationTable($('#t1-table'), {
      table,
      tosses,
      filled,
      sumFilled,
      justFilled: v.stage === 1 && v.s1 >= 1 && v.s1 <= R ? v.s1 - 1 : null,
      highlight,
      maxRow: argmaxRow(table),
      complete,
    });

    // stage 1 caption
    const tossStr = tosses.map((x) => TOSS_LETTERS[x]).join(' ');
    let cap1;
    if (v.stage > 1 || v.s1 > R) cap1 = T.stage1Sum({ nRows: R, tosses: tossStr, likelihood: fixed4(table.likelihood) });
    else if (v.s1 === 0) cap1 = T.stage1Start(R, tossStr);
    else {
      const row = table.rows[v.s1 - 1];
      const factors = row.factors.map((f) => `(${fmtProb(f.trans, f.isStart ? 1 : 2)} · ${fmtProb(f.emit, 1)})`).join(' × ');
      cap1 = T.stage1Row({ index: v.s1, nRows: R, path: row.states.map((x) => STATE_LETTERS[x]).join(' '), tosses: tossStr, factors, joint: fixed4(row.joint) });
      if (v.s1 === R) cap1 += ' ' + T.stage1AllRows(R);
    }
    $('#t1-cap1').textContent = cap1;

    // stage 2
    if (v.stage >= 2) {
      renderQuestions($('#t1-questions'), { question: v.question, qT: Math.min(v.qT, n), n });
      $('#t1-cap2').textContent = questionResult({ question: v.question, qT: Math.min(v.qT, n), table, tosses }).caption;
    }

    // stage 3
    if (v.stage === 3) {
      renderTrellisStage({
        svgEl: $('#t1-trellis'),
        titleEl: $('#t1-trellis-title'),
        eqEl: $('#t1-eqs'),
        captionEl: $('#t1-cap3'),
        params: s.params,
        tosses,
        vit,
        fb,
        mode: v.mode,
        s3: v.s3,
      });
    }
  };

  store.subscribe((s, prev) => {
    if (s.t1 !== prev.t1 || s.r1 !== prev.r1 || s.t1nav !== prev.t1nav || s.params !== prev.params) render(s);
  });
  render(store.get());

  return {
    keys: {
      next,
      back,
      space: next,
    },
  };
}
