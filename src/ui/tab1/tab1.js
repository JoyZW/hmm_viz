// "How HMMs work", on one screen: step bar + caption, one trellis with coin paths traced on it,
// and the enumeration table beside the three questions — all answered by brute force. The trellis
// passes that answer them without the list live in "Speeding it up" (../speed/).
import { tab1 as T, app as A, parseError } from '../../content/text.js';
import { parseTosses, tossesToString, TAB1_MAX } from '../../hmm/parse.js';
import { argmaxRow } from '../../hmm/enumerate.js';
import { fixed4 } from '../../hmm/format.js';
import { STATE_LETTERS, TOSS_LETTERS } from '../../hmm/model.js';
import { renderEnumerationTable } from './enumerationTable.js';
import { mountQuestions, renderQuestions, questionResult, Q_KEYS } from './questions.js';
import { renderPathTrellis, pathTrellisLine } from './pathTrellis.js';

export function mountTab1(el, store, actions) {
  el.innerHTML = `
    <div class="stepper t1-bar" role="group" aria-label="Step controls">
      <label for="t1-input" class="bar-label">${T.inputLabel}</label>
      <input type="text" id="t1-input" class="toss-input" maxlength="40" autocomplete="off" spellcheck="false"
        title="${T.inputHint}" aria-describedby="t1-error" />
      <span class="bar-sep" aria-hidden="true"></span>
      <button type="button" class="btn" id="t1-back" title="${T.stepperHint}">◀ Back</button>
      <button type="button" class="btn primary" id="t1-next" title="${T.stepperHint}">Next ▶</button>
      <button type="button" class="btn" id="t1-reset">Reset</button>
      <button type="button" class="btn" id="t1-fill">${T.fillAll}</button>
      <span class="progress" id="t1-progress"></span>
      <span class="error" id="t1-error" role="alert"></span>
    </div>
    <div class="impossible card" id="t1-impossible" hidden>${A.impossible}</div>
    <div id="t1-content">
      <p class="caption t1-caption" id="t1-cap" aria-live="polite"></p>

      <section class="card t1-trellis-card" aria-label="${T.trellisAria}">
        <div class="trellis-wrap"><svg id="t1-trellis" class="trellis-svg" role="img" aria-label="${T.trellisAria}"></svg></div>
        <div class="t1-under-row">
          <div id="t1-under" aria-live="polite"></div>
          <p class="pt-legend">${T.trellisLegend}</p>
        </div>
      </section>

      <div class="t1-lower">
        <section class="card t1-table-card" aria-label="${T.stageTitles[0]}">
          <div id="t1-table" class="table-wrap"></div>
        </section>
        <section class="card t1-q-card" aria-label="${T.stageTitles[1]}">
          <div id="t1-questions"></div>
        </section>
      </div>
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

  // Every step clears a row the user picked to trace (sel).
  const step = (patch) => actions.setT1Nav({ sel: null, ...patch });
  const next = () => {
    if (isImpossible()) return;
    const v = nav();
    if (v.stage === 1) {
      if (v.s1 < nRows() + 1) step({ s1: v.s1 + 1 });
      else step({ stage: 2, question: null, rev: [] });
    } else if (v.stage === 2) {
      const k = Q_KEYS.find((q) => !v.rev.includes(q));
      if (k) step({ question: k, rev: [...v.rev, k] });
      else actions.goSpeed(); // brute force is done: hand over to "Speeding it up"
    }
  };
  const back = () => {
    if (isImpossible()) return;
    const v = nav();
    if (v.stage === 2) {
      if (v.rev.length > 0) {
        const rev = v.rev.slice(0, -1);
        step({ rev, question: rev.length ? rev[rev.length - 1] : null });
      } else step({ stage: 1, s1: nRows() + 1, question: null });
    } else if (v.s1 > 0) step({ s1: v.s1 - 1 });
  };
  const reset = () => step({ stage: 1, s1: 0, question: null, rev: [] });

  /** A question card was clicked: answer it in Stage 2 (from Stage 1 once the table is complete). */
  const pickQuestion = (q, patch = {}) => {
    const v = nav();
    if (v.stage === 1) {
      if (v.s1 <= nRows()) return;
      step({ stage: 2, rev: [q], question: q, ...patch });
    } else step({ question: q, rev: v.rev.includes(q) ? v.rev : [...v.rev, q], ...patch });
  };

  // ── picking a filled table row traces it on the trellis ──
  const tableEl = $('#t1-table');
  const isPickable = (i) => {
    const v = nav();
    return i >= 0 && i < nRows() && (v.stage > 1 || i < v.s1);
  };
  const selectRow = (i) => {
    if (isPickable(i) && nav().sel !== i) actions.setT1Nav({ sel: i });
  };
  tableEl.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-i]');
    if (tr) selectRow(Number(tr.dataset.i));
  });
  tableEl.addEventListener('keydown', (e) => {
    const th = e.target.closest('th[data-i]');
    if (!th) return;
    const i = Number(th.dataset.i);
    let j;
    if (e.key === 'Enter' || e.key === ' ') j = i;
    else if (e.key === 'ArrowDown') j = i + 1;
    else if (e.key === 'ArrowUp') j = i - 1;
    else return;
    e.preventDefault();
    if (!isPickable(j)) return;
    selectRow(j);
    tableEl.querySelector(`th[data-i="${j}"]`)?.focus();
  });

  $('#t1-next').addEventListener('click', next);
  $('#t1-back').addEventListener('click', back);
  $('#t1-reset').addEventListener('click', reset);
  $('#t1-fill').addEventListener('click', () => {
    if (nav().stage === 1) step({ s1: nRows() + 1 });
  });

  mountQuestions($('#t1-questions'), {
    onPick: (q) => pickQuestion(q),
    onToss: (t) => pickQuestion('post', { qT: t }),
  });

  // ── render ──
  const render = (s) => {
    const { tosses } = s.t1;
    const { table, fb } = s.r1;
    const v = s.t1nav;
    const n = tosses.length;
    const R = 1 << n;
    const tossStr = tosses.map((x) => TOSS_LETTERS[x]).join(' ');

    if (document.activeElement !== input) {
      input.value = tossesToString(tosses, ' ');
      input.classList.remove('invalid');
      errEl.textContent = '';
    }

    const impossible = fb.impossible;
    $('#t1-impossible').hidden = !impossible;
    $('#t1-content').hidden = impossible;
    ['#t1-back', '#t1-next', '#t1-reset', '#t1-fill'].forEach((id) => ($(id).hidden = impossible));
    $('#t1-progress').hidden = impossible;
    if (impossible) return;

    // controls
    const tableDone = v.stage > 1 || v.s1 > R;
    $('#t1-fill').disabled = v.stage !== 1 || tableDone;
    $('#t1-back').disabled = v.stage === 1 && v.s1 === 0;
    // after the last question, Next hands over to "Speeding it up"
    $('#t1-next').textContent = v.stage === 2 && v.rev.length === Q_KEYS.length ? T.toSpeed : 'Next ▶';

    // progress label
    let prog;
    if (v.stage === 1) prog = `Stage 1 of 2 · ${T.stageTitles[0]} · ${Math.min(v.s1, R)} / ${R} rows${v.s1 > R ? ' + Sum' : ''}`;
    else prog = `Stage 2 of 2 · ${T.stageTitles[1]} · ${v.rev.length} / 3`;
    $('#t1-progress').textContent = prog;

    const qT = Math.min(v.qT, n);
    const qr = v.stage === 2 ? questionResult({ question: v.question, qT, table, tosses }) : null;
    const picked = v.sel !== null && v.sel < R ? v.sel : null;
    const pathStr = (i) => table.rows[i].states.map((x) => STATE_LETTERS[x]).join(' ');

    // ── table highlight, trellis view, highlighted question card, caption ──
    let highlight = {};
    let view; // what the traced trellis shows
    let activeCard = null;
    let caption = '';
    const under = $('#t1-under');
    if (v.stage === 1) {
      view = v.s1 === 0 ? { kind: 'none' } : v.s1 <= R ? { kind: 'row', row: v.s1 - 1 } : { kind: 'all' };
      if (v.s1 === 0) caption = T.stage1Start(R, tossStr);
      else if (v.s1 <= R) caption = T.stage1RowShort({ index: v.s1, nRows: R }) + (v.s1 === R ? ' ' + T.stage1AllRows(R) : '');
      else caption = T.stage1Sum({ nRows: R, tosses: tossStr, likelihood: fixed4(table.likelihood) });
    } else {
      highlight = qr.highlight;
      view = qr.trellis;
      activeCard = v.question;
      caption = qr.caption + (v.rev.length === Q_KEYS.length && v.question ? ' ' + T.stage2Done : '');
    }
    if (picked !== null) {
      view = { kind: 'row', row: picked };
      caption = T.stage1Picked(pathStr(picked));
    }

    renderPathTrellis($('#t1-trellis'), { params: s.params, tosses, table, view });
    under.className = 'pt-line';
    under.innerHTML = pathTrellisLine({ table, tosses, view });
    $('#t1-cap').textContent = caption;

    // ── enumeration table (keep keyboard focus on a picked row across the re-render) ──
    const focusRow = tableEl.contains(document.activeElement) ? document.activeElement.dataset.i : undefined;
    renderEnumerationTable(tableEl, {
      table,
      tosses,
      filled: v.stage === 1 ? Math.min(v.s1, R) : R,
      sumFilled: tableDone,
      justFilled: picked === null && v.stage === 1 && v.s1 >= 1 && v.s1 <= R ? v.s1 - 1 : null,
      highlight,
      maxRow: argmaxRow(table),
      complete: tableDone,
      clickable: true,
      selected: view.kind === 'row' && !view.viterbi ? view.row : null,
    });
    if (focusRow !== undefined) tableEl.querySelector(`th[data-i="${focusRow}"]`)?.focus();

    // ── the three questions ──
    renderQuestions($('#t1-questions'), {
      active: activeCard,
      rev: v.stage === 2 ? v.rev : [],
      inactive: !tableDone,
      qT,
      table,
      tosses,
    });
  };

  store.subscribe((s, prev) => {
    if (s.t1 !== prev.t1 || s.r1 !== prev.r1 || s.t1nav !== prev.t1nav || s.params !== prev.params) render(s);
  });
  render(store.get());

  // the trellis spreads its columns to the card width; redraw when that changes
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => render(store.get()), 80);
  });
  // a hidden tab measures 0 wide; redraw when this tab becomes visible
  store.subscribe((s, prev) => {
    if (s.tab === 'how' && prev.tab !== 'how') render(s);
  });

  return {
    keys: {
      next,
      back,
      space: next,
    },
  };
}
