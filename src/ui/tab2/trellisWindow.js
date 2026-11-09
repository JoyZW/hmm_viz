// Tab 2 — detail window of the Viterbi trellis (~25 columns around the cursor) plus the equation panel.
import * as d3 from 'd3';
import { tab2 as T } from '../../content/text.js';
import { sciPartsFromLog, sciFromLog, fmtLn, fmtProb, sub, sup } from '../../hmm/format.js';
import { STATE_LETTERS, STATE_NAMES, TOSS_LETTERS } from '../../hmm/model.js';
import { recursionLine, firstLine, plainLine, stateSpan } from '../equation.js';

export const PITCH = 68;
const CW = 52;
const CH = 52;
const LM = 58;
const TOP = 42;
const ROW_GAP = 54;
const ROW_Y = [TOP, TOP + CH + ROW_GAP];
const HEIGHT = ROW_Y[1] + CH + 10;
const MAX_COLS = 25;
const MIN_COLS = 9;

/** Number of detail columns that fit in a container of the given pixel width (odd, 9–25). */
export function windowColumns(width) {
  let c = Math.floor((width - LM - 8) / PITCH);
  c = Math.max(MIN_COLS, Math.min(MAX_COLS, c));
  return c % 2 === 0 ? c - 1 : c;
}

export function mountTrellisWindow(el) {
  el.innerHTML = `
    <div class="tw-head">
      <label class="check"><input type="checkbox" id="tw-ln" /> ${T.showLn}</label>
    </div>
    <div class="tw-svg-wrap"><svg class="tw-svg" role="img" aria-label="Viterbi trellis detail window"></svg></div>
    <div class="equations tw-eqs" id="tw-eqs" aria-live="polite"></div>
    <p class="tw-summary" id="tw-summary"></p>`;
  const svg = d3.select(el.querySelector('svg'));
  const defs = svg.append('defs');
  ['win', 'fade', 'path'].forEach((c) =>
    defs
      .append('marker')
      .attr('id', `tw-ah-${c}`)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('markerUnits', 'userSpaceOnUse')
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,0 L10,5 L0,10 z')
      .attr('class', `ah ${c}`),
  );
  const g = svg.append('g');
  return {
    lnToggle: el.querySelector('#tw-ln'),
    render: (v) => render(v, svg, g, el),
  };
}

/**
 * v: { params, tosses, vit, k, winStart, winCount, showLn, truePath }
 */
function render(v, svg, g, el) {
  const { params, tosses, vit, k, winStart, winCount, showLn } = v;
  const n = tosses.length;
  const fwd = Math.min(k, n);
  const bt = Math.max(0, k - n);
  const btFrom = n - bt;
  const cur = k === 0 ? -1 : k <= n ? k - 1 : n - bt;
  const path = vit.path;
  const width = LM + winCount * PITCH + 6;
  svg.attr('viewBox', `0 0 ${width} ${HEIGHT}`).attr('width', width).attr('height', HEIGHT);
  el.querySelector('#tw-ln').checked = showLn;
  g.selectAll('*').remove();

  const colX = (t) => LM + (t - winStart) * PITCH + (PITCH - CW) / 2;
  const end = Math.min(n, winStart + winCount);

  // row labels
  for (let s = 0; s < 2; s++) {
    g.append('text')
      .attr('class', `tw-rowlabel st-${STATE_LETTERS[s]}`)
      .attr('x', LM - 8)
      .attr('y', ROW_Y[s] + CH / 2 + 4)
      .attr('text-anchor', 'end')
      .text(STATE_NAMES[s]);
  }
  if (cur >= winStart && cur < end) {
    g.append('rect')
      .attr('class', 'col-highlight')
      .attr('x', colX(cur) - 7)
      .attr('y', 2)
      .attr('width', CW + 14)
      .attr('height', HEIGHT - 4)
      .attr('rx', 6);
  }

  const arrows = g.append('g');
  const pathG = g.append('g');
  const cells = g.append('g');
  const revealed = (t) => t < fwd;
  const onPath = (t) => bt > 0 && t >= btFrom;

  for (let t = winStart; t < end; t++) {
    const x = colX(t);
    const col = vit.columns[t];
    // headers
    g.append('text').attr('class', 'tw-idx').attr('x', x + CW / 2).attr('y', 13).attr('text-anchor', 'middle').text(t + 1);
    g.append('text')
      .attr('class', `tw-toss toss-${TOSS_LETTERS[tosses[t]]}`)
      .attr('x', x + CW / 2)
      .attr('y', 31)
      .attr('text-anchor', 'middle')
      .text(TOSS_LETTERS[tosses[t]]);

    // incoming arrows (from the previous column, if it is inside the window)
    if (revealed(t) && t > 0 && t - 1 >= winStart) {
      const px = colX(t - 1) + CW;
      for (let s = 0; s < 2; s++) {
        for (let r = 0; r < 2; r++) {
          const y1 = r === s ? ROW_Y[r] + CH / 2 : r === 0 ? ROW_Y[0] + CH - 6 : ROW_Y[1] + 6;
          const y2 = r === s ? ROW_Y[s] + CH / 2 : s === 0 ? ROW_Y[0] + CH - 6 : ROW_Y[1] + 6;
          let style = col.phi[s] === r ? 'win' : 'fade';
          if (onPath(t) && onPath(t - 1) && path[t] === s && path[t - 1] === r) style = 'path';
          arrows
            .append('line')
            .attr('class', `arrow tw ${style}`)
            .attr('x1', px)
            .attr('y1', y1)
            .attr('x2', x - 1)
            .attr('y2', y2)
            .attr('marker-end', `url(#tw-ah-${style})`);
        }
      }
    }

    for (let s = 0; s < 2; s++) {
      const y = ROW_Y[s];
      const cg = cells.append('g').attr('class', `tw-cell st-${STATE_LETTERS[s]} ${revealed(t) ? 'revealed' : 'empty'} ${onPath(t) && path[t] === s ? 'on-path' : ''}`);
      cg.append('rect').attr('x', x).attr('y', y).attr('width', CW).attr('height', CH).attr('rx', 5);
      if (!revealed(t)) continue;
      const ld = col.logDelta[s];
      if (showLn) {
        cg.append('text').attr('class', 'tw-val').attr('x', x + CW / 2).attr('y', y + 22).attr('text-anchor', 'middle').text(fmtLn(ld, 1));
      } else {
        const p = sciPartsFromLog(ld);
        if (p.zero) {
          cg.append('text').attr('class', 'tw-val').attr('x', x + CW / 2).attr('y', y + 22).attr('text-anchor', 'middle').text('0');
        } else {
          cg.append('text').attr('class', 'tw-val').attr('x', x + CW / 2).attr('y', y + 16).attr('text-anchor', 'middle').text(p.mantissa);
          cg.append('text')
            .attr('class', 'tw-exp')
            .attr('x', x + CW / 2)
            .attr('y', y + 30)
            .attr('text-anchor', 'middle')
            .text(`×10${sup(p.exponent)}`);
        }
      }
      cg.append('text')
        .attr('class', 'tw-emit')
        .attr('x', x + CW / 2)
        .attr('y', y + CH - 6)
        .attr('text-anchor', 'middle')
        .text(`b=${fmtProb(params.emit[s][tosses[t]], 1)}`);
    }
  }

  // Viterbi path line through the backtracked part of the window
  if (bt > 0) {
    const pts = [];
    for (let t = Math.max(winStart, btFrom); t < end; t++) pts.push([colX(t) + CW / 2, ROW_Y[path[t]] + CH / 2]);
    if (pts.length > 1) pathG.append('path').attr('class', 'tw-pathline').attr('d', d3.line()(pts));
  }

  // equation panel
  el.querySelector('#tw-eqs').innerHTML = equations(v, cur, bt);
  el.querySelector('#tw-summary').innerHTML = summary(v, bt);
}

function equations(v, cur, bt) {
  const { params, tosses, vit, k, showLn } = v;
  const n = tosses.length;
  const S = (s) => STATE_LETTERS[s];
  const fmt = (ln) => (showLn ? fmtLn(ln, 1) : sciFromLog(ln));
  const lnP = (p) => fmtLn(Math.log(p), 3);
  if (k === 0) return plainLine(T.eqIdle);
  if (bt === 0) {
    const c = cur;
    const col = vit.columns[c];
    const lines = [];
    for (let s = 0; s < 2; s++) {
      const emit = showLn ? lnP(params.emit[s][tosses[c]]) : fmtProb(params.emit[s][tosses[c]], 1);
      if (c === 0) {
        lines.push(firstLine({ letter: 'δ', s: S(s), start: showLn ? lnP(params.start[s]) : fmtProb(params.start[s], 1), emit, result: fmt(col.logDelta[s]), log: showLn }));
      } else {
        const prev = vit.columns[c - 1].logDelta;
        const terms = [0, 1].map((r) =>
          showLn ? `${fmtLn(prev[r], 1)} + ${lnP(params.trans[r][s])}` : `${sciFromLog(prev[r])} · ${fmtProb(params.trans[r][s], 2)}`,
        );
        lines.push(recursionLine({ mode: 'max', letter: 'δ', t: sub(c + 1), s: S(s), terms, emit, result: fmt(col.logDelta[s]), winner: S(col.phi[s]), log: showLn }));
      }
    }
    return lines.join('');
  }
  const path = vit.path;
  const last = vit.columns[n - 1].logDelta;
  if (bt === 1) {
    return plainLine(T.eqBacktrackStart({ n: sub(n), fVal: fmt(last[0]), bVal: fmt(last[1]), s: stateSpan(S(path[n - 1])) }));
  }
  const t = cur + 2; // 1-based column whose backpointer was followed
  return plainLine(T.eqBacktrackStep({ t, tSub: sub(t), s: stateSpan(S(path[t - 1])), prev: stateSpan(S(path[t - 2])) }));
}

function summary(v, bt) {
  const n = v.tosses.length;
  if (bt < n) return '';
  let out = T.viterbiJoint(v.showLn ? `ln = ${fmtLn(v.vit.logJoint, 1)}` : sciFromLog(v.vit.logJoint));
  if (v.truePath) {
    let agree = 0;
    for (let t = 0; t < n; t++) if (v.truePath[t] === v.vit.path[t]) agree++;
    out += ' · ' + T.agreement(`${((100 * agree) / n).toFixed(1)}%`);
  }
  return out;
}
