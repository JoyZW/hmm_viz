// "Long sequences" — precision comparison: Naive vs Rescaled vs Log-space on the current sequence,
// drawn (precisionChart.js) and tabulated; hovering a table row highlights its part of the chart.
import { tab2 as T } from '../../content/text.js';
import { fmtLn, sciFromLog } from '../../hmm/format.js';
import { METHOD_ORDER } from '../../hmm/precision.js';
import { mountPrecisionChart } from './precisionChart.js';

/** Table rows that have a counterpart on the chart. */
const LINKS = { underflow: 'underflow', nan: 'nan', differs: 'differs' };

export function mountPrecisionPanel(el, { onTryN }) {
  el.innerHTML = `
    <p class="explain">${T.precisionExplain}</p>
    <div class="field-row"><button type="button" class="btn" id="pp-try">${T.tryN}</button></div>
    <div id="pp-chart"></div>
    <p class="hint">${T.tableLinkHint}</p>
    <div class="table-wrap"><table class="precision-table"></table></div>`;
  el.querySelector('#pp-try').addEventListener('click', () => onTryN(2000));
  const table = el.querySelector('table');
  const chart = mountPrecisionChart(el.querySelector('#pp-chart'));
  table.addEventListener('mouseover', (e) => chart.highlight(e.target.closest('tr[data-link]')?.dataset.link ?? null));
  table.addEventListener('mouseleave', () => chart.highlight(null));

  function render(report, tosses) {
    chart.render(report, tosses);
    const m = report.methods;
    const cell = (txt, bad = false) => `<td class="${bad ? 'bad' : ''}">${txt}</td>`;
    const rows = [
      [
        'logLik',
        (k) => {
          const v = m[k].logLikelihood;
          return cell(fmtLn(v, 3), !Number.isFinite(v));
        },
      ],
      [
        'underflow',
        (k) => {
          if (k !== 'naive') return cell(T.na);
          const f = m[k].firstUnderflow;
          return cell(f === null ? T.none : String(f), f !== null);
        },
      ],
      ['nan', (k) => cell(String(m[k].nanPosteriors), m[k].nanPosteriors > 0)],
      [
        'differs',
        (k) => (k === 'log' ? cell(T.reference) : cell(T.tosses(m[k].viterbiDiffers), m[k].viterbiDiffers > 0)),
      ],
      [
        'smallest',
        (k) => {
          const s = m[k].smallestStored;
          if (s.kind === 'log') return cell(T.logStored(s.minLog === null ? '—' : fmtLn(s.minLog, 1)));
          return cell(s.value === null ? '—' : sciFromLog(Math.log(s.value)), s.value !== null && s.value < 1e-300);
        },
      ],
    ];
    table.innerHTML = `
      <thead><tr><th scope="col"></th>${METHOD_ORDER.map((k) => `<th scope="col">${T.methodNames[k]}</th>`).join('')}</tr></thead>
      <tbody>${rows
        .map(([key, f]) => `<tr${LINKS[key] ? ` data-link="${LINKS[key]}" class="linkable"` : ''}><th scope="row" title="${T.precisionTooltips[key]}">${T.precisionRows[key]}</th>${METHOD_ORDER.map(f).join('')}</tr>`)
        .join('')}</tbody>`;
  }
  return { render };
}
