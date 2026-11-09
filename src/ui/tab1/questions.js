// Stage 2 — the three questions, answered from the enumeration table.
import { tab1 as T } from '../../content/text.js';
import { posteriorByFiltering, argmaxRow } from '../../hmm/enumerate.js';
import { fixed4, sig3 } from '../../hmm/format.js';
import { STATE_LETTERS, TOSS_LETTERS } from '../../hmm/model.js';

const KEYS = ['lik', 'post', 'vit'];

export function mountQuestions(el, { onPick, onToss }) {
  el.innerHTML = `
    <div class="q-buttons" role="group" aria-label="Questions">
      ${KEYS.map((k, i) => `<button type="button" class="btn q-btn" data-q="${k}" aria-pressed="false">${i + 1}. ${T.questions[i]}</button>`).join('')}
    </div>
    <div class="toss-picker" hidden>
      <span class="label">${T.tossPickerLabel}</span>
      <span class="picker-buttons" role="group" aria-label="${T.tossPickerLabel}"></span>
    </div>`;
  el.querySelectorAll('.q-btn').forEach((b) => b.addEventListener('click', () => onPick(b.dataset.q)));
  el.querySelector('.picker-buttons').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-t]');
    if (b) onToss(Number(b.dataset.t));
  });
}

export function renderQuestions(el, { question, qT, n }) {
  el.querySelectorAll('.q-btn').forEach((b) => {
    const on = b.dataset.q === question;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  const picker = el.querySelector('.toss-picker');
  picker.hidden = question !== 'post';
  const pb = el.querySelector('.picker-buttons');
  pb.innerHTML = Array.from(
    { length: n },
    (_, i) => `<button type="button" class="btn small ${qT === i + 1 ? 'active' : ''}" data-t="${i + 1}" aria-pressed="${qT === i + 1}">${i + 1}</button>`,
  ).join('');
}

/** Highlight spec + caption text for the chosen question. */
export function questionResult({ question, qT, table, tosses }) {
  const nRows = table.rows.length;
  const tossStr = tosses.map((x) => TOSS_LETTERS[x]).join(' ');
  if (question === 'lik') {
    return { highlight: { sum: true }, caption: T.qLikelihood({ nRows, tosses: tossStr, likelihood: fixed4(table.likelihood) }) };
  }
  if (question === 'post') {
    const r = posteriorByFiltering(table, qT - 1);
    return {
      highlight: { rows: new Set(r.rows), sum: true },
      caption: T.qPosterior({ t: qT, count: r.rows.length, numerator: fixed4(r.numerator), likelihood: fixed4(table.likelihood), posterior: sig3(r.posterior) }),
    };
  }
  if (question === 'vit') {
    const i = argmaxRow(table);
    const row = table.rows[i];
    return {
      highlight: { max: i },
      caption: T.qViterbi({ path: row.states.map((s) => STATE_LETTERS[s]).join(' '), joint: fixed4(row.joint), nRows }),
    };
  }
  return { highlight: {}, caption: T.stage2Intro };
}
