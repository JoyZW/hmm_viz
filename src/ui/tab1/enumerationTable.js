// Stage 1 — enumeration table (matches docs/img/output-table.png).
import { tab1 as T } from '../../content/text.js';
import { fixed4, fmtProb } from '../../hmm/format.js';
import { STATE_LETTERS, TOSS_LETTERS } from '../../hmm/model.js';

/**
 * @param {HTMLElement} el
 * @param {{table, tosses: number[], filled: number, sumFilled: boolean, justFilled: number|null,
 *          highlight: {rows?: Set<number>, sum?: boolean, max?: number|null}, maxRow: number, complete: boolean,
 *          selected: number|null, clickable: boolean}} v
 *   selected = row traced on the trellis; clickable = rows can be picked to trace (Stages 1–2)
 */
export function renderEnumerationTable(el, v) {
  const { table, tosses } = v;
  const n = tosses.length;
  const tossStr = tosses.map((x) => TOSS_LETTERS[x]).join(' ');
  const hl = v.highlight || {};
  const head = `<tr><th scope="col">${T.coinPathHeader}</th>${tosses
    .map((x, i) => `<th scope="col">toss ${i + 1}: ${TOSS_LETTERS[x]}</th>`)
    .join('')}<th scope="col">Pr(q, ${tossStr})</th></tr>`;

  const body = table.rows
    .map((r, i) => {
      const filled = i < v.filled;
      const cls = [
        i === v.justFilled ? 'just-filled' : '',
        hl.rows?.has(i) ? 'hl' : '',
        hl.max === i ? 'hl hl-max' : '',
        v.complete && i === v.maxRow ? 'is-max' : '',
        filled && v.clickable ? 'clickable' : '',
        i === v.selected ? 'sel' : '',
      ].join(' ');
      const path = r.states.map((s) => `<span class="st st-${STATE_LETTERS[s]}">${STATE_LETTERS[s]}</span>`).join(' ');
      const cells = r.factors
        .map((f, k) => {
          const txt = filled ? `${fmtProb(f.trans, f.isStart ? 1 : 2)} · ${fmtProb(f.emit, 1)}` : '';
          return `<td class="factor math" style="--k:${k}">${txt}</td>`;
        })
        .join('');
      const joint = filled ? fixed4(r.joint) : '';
      const focus = filled && v.clickable ? ` tabindex="0" aria-label="${T.traceRowLabel(r.states.map((s) => STATE_LETTERS[s]).join(' '))}"` : '';
      return `<tr class="${cls}" data-i="${i}"><th scope="row" class="path" data-i="${i}"${focus}>${path}</th>${cells}<td class="joint" style="--k:${n}">${joint}</td></tr>`;
    })
    .join('');

  const sumCls = `sum-row ${hl.sum ? 'hl' : ''} ${v.sumFilled ? 'is-filled' : ''}`;
  const sumRow = `<tr class="${sumCls}"><th scope="row">${T.sumLabel}</th>${tosses.map(() => '<td></td>').join('')}<td class="joint">${
    v.sumFilled ? fixed4(table.likelihood) : ''
  }</td></tr>`;

  el.innerHTML = `<table class="enum-table n${n}"><thead>${head}</thead><tbody>${body}${sumRow}</tbody></table>`;
}
