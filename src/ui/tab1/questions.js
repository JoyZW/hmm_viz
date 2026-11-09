// Stage 2 — the three questions, as compact cards beside the enumeration table
// (question + lecture symbols, then the answer from the n rows).
import { tab1 as T } from '../../content/text.js';
import { posteriorByFiltering, argmaxRow } from '../../hmm/enumerate.js';
import { fixed4, sig3 } from '../../hmm/format.js';
import { STATE_LETTERS, TOSS_LETTERS } from '../../hmm/model.js';

export const Q_KEYS = ['lik', 'post', 'vit'];

export function mountQuestions(el, { onPick, onToss }) {
  el.addEventListener('click', (e) => {
    if (el.querySelector('.q-cards.inactive')) return;
    const tb = e.target.closest('button[data-t]');
    if (tb) {
      onToss(Number(tb.dataset.t));
      return;
    }
    const row = e.target.closest('[data-q]');
    if (row) onPick(row.dataset.q);
  });
}

/**
 * rev: questions answered so far; active: the card to highlight (or null);
 * inactive: the table is not complete yet, so the cards cannot be used.
 */
export function renderQuestions(el, { active, rev, inactive, qT, table, tosses }) {
  const n = tosses.length;
  const nRows = table.rows.length;
  // keep keyboard focus across the re-render
  const a = document.activeElement;
  const focusKey = el.contains(a) ? (a.dataset.t ? `[data-t="${a.dataset.t}"]` : a.dataset.q ? `button[data-q="${a.dataset.q}"]` : null) : null;
  const dis = inactive ? ' disabled' : '';

  const picker = `<span class="toss-picker"><span class="label">${T.tossPickerLabel}</span><span class="picker-buttons" role="group" aria-label="${T.tossPickerLabel}">${Array.from(
    { length: n },
    (_, i) => `<button type="button" class="btn small ${qT === i + 1 ? 'active' : ''}" data-t="${i + 1}" aria-pressed="${qT === i + 1}"${dis}>${i + 1}</button>`,
  ).join('')}</span></span>`;

  const cards = Q_KEYS.map((k, i) => {
    const on = k === active;
    const answer = rev.includes(k) ? questionResult({ question: k, qT, table, tosses }).answer : '';
    return `<div class="q-card q-${k} ${on ? 'active' : ''}" data-q="${k}">
      <div class="q-top">
        <span class="q-title"><button type="button" class="q-btn" data-q="${k}" aria-pressed="${on}"${dis}>${i + 1}. ${T.questions[i]}</button>${k === 'post' ? picker : ''}</span>
        <span class="q-sym">${T.qSymbols[i]}</span>
      </div>
      <div class="q-ans" aria-live="polite">${answer}</div>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="q-head"><h2>${T.qHeading}</h2><span class="q-sub">${T.qHead.answer(nRows)}</span></div>
    <div class="q-cards ${inactive ? 'inactive' : ''}">${cards}</div>
    <p class="note q-foot">${inactive ? T.qInactive : T.qFootnote}</p>`;
  if (focusKey) el.querySelector(focusKey)?.focus();
}

const pathHtml = (states) => states.map((s) => `<span class="st st-${STATE_LETTERS[s]}">${STATE_LETTERS[s]}</span>`).join(' ');

/** Highlight spec, Stage 1 trellis view, answer cell and caption for one question. */
export function questionResult({ question, qT, table, tosses }) {
  const nRows = table.rows.length;
  const tossStr = tosses.map((x) => TOSS_LETTERS[x]).join(' ');
  const likelihood = fixed4(table.likelihood);
  if (question === 'lik') {
    return {
      highlight: { sum: true },
      trellis: { kind: 'all' },
      answer: T.aLikelihood({ nRows, likelihood }),
      caption: T.qLikelihood({ nRows, tosses: tossStr, likelihood }),
    };
  }
  if (question === 'post') {
    const r = posteriorByFiltering(table, qT - 1);
    const f = { t: qT, numerator: fixed4(r.numerator), likelihood, posterior: sig3(r.posterior), complement: sig3(1 - r.posterior) };
    return {
      highlight: { rows: new Set(r.rows), sum: true },
      trellis: { kind: 'node', t: qT - 1, s: 1 },
      answer: T.aPosterior(f),
      caption: T.qPosterior({ ...f, count: r.rows.length }),
    };
  }
  if (question === 'vit') {
    const i = argmaxRow(table);
    const row = table.rows[i];
    return {
      highlight: { max: i },
      trellis: { kind: 'row', row: i, viterbi: true },
      answer: T.aViterbi({ path: pathHtml(row.states), joint: fixed4(row.joint) }),
      caption: T.qViterbi({ path: row.states.map((s) => STATE_LETTERS[s]).join(' '), joint: fixed4(row.joint), nRows }),
    };
  }
  return { highlight: {}, trellis: { kind: 'all' }, answer: '', caption: T.stage2Intro };
}
