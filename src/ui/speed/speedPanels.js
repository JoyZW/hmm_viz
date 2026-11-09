// "Speeding it up" — the value table (fills cell by cell with the trellis) and the answer card.
import { speed as T, tab1 as T1 } from '../../content/text.js';
import { sig3, fixed4, sub } from '../../hmm/format.js';
import { F, B, STATE_LETTERS, TOSS_LETTERS } from '../../hmm/model.js';
import { posteriorByFiltering, argmaxRow } from '../../hmm/enumerate.js';

const S = (s) => STATE_LETTERS[s];
const st = (s) => `<span class="st st-${S(s)}">${S(s)}</span>`;
const Q_INDEX = { lik: 0, post: 1, vit: 2 };

/** The trellis values as a table: rows depend on the question, one column per toss. */
export function renderSpeedTable(el, { q, tosses, V, d, qT }) {
  const n = tosses.length;
  const cur = (c, s, kind) => {
    if (kind === 'a' && d.phase === 'fwd') return d.curNode.c === c && d.curNode.s === s;
    if (kind === 'b' && d.phase === 'bwd') return d.curNode.c === c && d.curNode.s === s;
    if (kind === 'b' && d.phase === 'binit') return c === n - 1;
    if (kind === 'phi' && d.phase === 'fwd') return d.curNode.c === c && d.curNode.s === s && c > 0;
    if ((kind === 'post' && d.phase === 'post') || (kind === 'path' && d.phase === 'bt')) return d.curCol === c;
    // backtrack: step 1 compares the last δ column; later steps read one backpointer
    if (kind === 'a' && d.phase === 'bt' && d.backtrack === 1) return c === n - 1;
    if (kind === 'phiRead' && d.phase === 'bt' && d.backtrack >= 2) return c === n - d.backtrack + 1 && s === V.path[c];
    return false;
  };
  const cell = (txt, cls) => `<td class="${cls}">${txt}</td>`;
  const rows = [];
  const label = (html, cls = '') => `<th scope="row" class="${cls}">${html}</th>`;
  const L = (letter, s) => `${letter}(${st(s)})`;

  if (q === 'lik' || q === 'post') {
    for (let s = 0; s < 2; s++) {
      rows.push(`<tr>${label(L('α', s), 'lab-a')}${tosses.map((_, c) => cell(d.isA(c, s) ? sig3(V.alpha[c][s]) : '', `v-a ${cur(c, s, 'a') ? 'cur' : ''}`)).join('')}</tr>`);
    }
  }
  if (q === 'post') {
    for (let s = 0; s < 2; s++) {
      rows.push(`<tr>${label(L('β', s), 'lab-b')}${tosses.map((_, c) => cell(d.isB(c, s) ? sig3(V.beta[c][s]) : '', `v-b ${cur(c, s, 'b') ? 'cur' : ''}`)).join('')}</tr>`);
    }
    rows.push(
      `<tr class="post-row">${label(T.postRow)}${tosses
        .map((_, c) => cell(d.hasPost(c) ? sig3(V.post[c]) : '', `v-p ${d.hasPost(c) ? 'filled' : ''} ${c === qT - 1 ? 'pick' : ''} ${cur(c, 0, 'post') ? 'cur' : ''}`))
        .join('')}</tr>`,
    );
  }
  if (q === 'vit') {
    for (let s = 0; s < 2; s++) {
      rows.push(`<tr>${label(L('δ', s), 'lab-a')}${tosses.map((_, c) => cell(d.isA(c, s) ? sig3(V.delta[c][s]) : '', `v-a ${cur(c, s, 'a') ? 'cur' : ''}`)).join('')}</tr>`);
    }
    for (let s = 0; s < 2; s++) {
      rows.push(
        `<tr>${label(L('φ', s))}${tosses
          .map((_, c) => cell(c === 0 ? '—' : d.isA(c, s) ? st(V.phi[c][s]) : '', `v-phi ${cur(c, s, 'phi') ? 'cur' : ''} ${cur(c, s, 'phiRead') ? 'cur read' : ''}`))
          .join('')}</tr>`,
      );
    }
    rows.push(`<tr class="path-row">${label(T.pathRow)}${tosses.map((_, c) => cell(d.onPath(c) ? st(V.path[c]) : '', `v-path ${cur(c, 0, 'path') ? 'cur' : ''}`)).join('')}</tr>`);
  }
  const head = `<tr><th scope="col"></th>${tosses.map((x, c) => `<th scope="col">toss ${c + 1}: ${TOSS_LETTERS[x]}</th>`).join('')}</tr>`;
  el.innerHTML = `<div class="q-head"><h2>${T.tableHead}</h2></div><table class="speed-table n${n}"><thead>${head}</thead><tbody>${rows.join('')}</tbody></table>`;
}

/** The answer card for the selected question, with the brute-force check from the enumeration table. */
export function renderSpeedCard(el, { q, tosses, V, d, qT, table }) {
  const n = tosses.length;
  const i = Q_INDEX[q];
  const a = document.activeElement;
  const focusT = el.contains(a) && a.dataset.t ? a.dataset.t : null;
  const close = (x, y) => Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(y));
  const check = (ok, html) => `<div class="sc-check ${ok ? 'ok' : 'bad'}">${ok ? html : `✗ ${T.checkFail}`}</div>`;

  let answer = '';
  if (q === 'lik' && d.total) {
    answer = T.aLik({ n: sub(n), f: sig3(V.alpha[n - 1][F]), b: sig3(V.alpha[n - 1][B]), total: fixed4(V.L) });
    answer += check(close(V.L, table.likelihood), T.checkLik(fixed4(table.likelihood)));
  } else if (q === 'post' && d.hasPost(qT - 1)) {
    const c = qT - 1;
    const p = V.post[c];
    answer = T.aPost({ t: qT, a:sig3(V.alpha[c][B]), b: sig3(V.beta[c][B]), L: fixed4(V.L), p: sig3(p), pF: sig3(1 - p) });
    const r = posteriorByFiltering(table, c);
    answer += check(close(p, r.posterior), T.checkPost({ t: qT, num: fixed4(r.numerator), L: fixed4(table.likelihood) }));
  } else if (q === 'vit' && d.backtrack === n) {
    const best = table.rows[argmaxRow(table)];
    answer = T.aVit({ path: V.path.map(st).join(' '), joint: fixed4(V.joint) });
    answer += check(close(V.joint, best.joint) && best.states.every((s, t) => s === V.path[t]), T.checkVit(fixed4(best.joint)));
  } else answer = `<span class="muted">${T.notYet}</span>`;

  const picker =
    q === 'post'
      ? `<span class="toss-picker"><span class="label">${T1.tossPickerLabel}</span><span class="picker-buttons" role="group" aria-label="${T1.tossPickerLabel}">${tosses
          .map((_, c) => `<button type="button" class="btn small ${qT === c + 1 ? 'active' : ''}" data-t="${c + 1}" aria-pressed="${qT === c + 1}">${c + 1}</button>`)
          .join('')}</span></span>`
      : '';

  el.innerHTML = `<div class="q-head"><h2>Question ${i + 1}</h2><span class="q-sub">${T.qMethod[i]}</span></div>
    <div class="q-card active q-${q}">
      <div class="q-top">
        <span class="q-title"><span class="q-btn as-text">${i + 1}. ${T1.questions[i]}</span>${picker}</span>
        <span class="q-sym">${T1.qSymbols[i]}</span>
      </div>
      <div class="sc-how">${T.how[q]}</div>
      <div class="q-ans" aria-live="polite">${answer}</div>
    </div>`;
  if (focusT) el.querySelector(`[data-t="${focusT}"]`)?.focus();
}
