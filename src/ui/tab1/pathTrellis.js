// Stages 1–2 — the trellis with one coin path traced: each enumeration-table row is one way through it.
// ("Speeding it up" runs the trellis passes on the same geometry: ../speed/speedTrellis.js.)
// Transition probabilities on the arrows, emission probability of the observed toss in each node.
import * as d3 from 'd3';
import { tab1 as T } from '../../content/text.js';
import { fmtProb, fixed4 } from '../../hmm/format.js';
import { posteriorByFiltering } from '../../hmm/enumerate.js';
import { STATE_LETTERS, STATE_NAMES, TOSS_LETTERS, TOSS_NAMES } from '../../hmm/model.js';
import { R, START, H, HEAD_Y, layout, nodePos, arrowPts, arrowLabelPos, startLabelPos, addMarkers } from './trellisGeom.js';

/**
 * What the trellis shows:
 *   {kind: 'none'}                          — nothing traced
 *   {kind: 'all'}                           — every coin path counts (likelihood)
 *   {kind: 'row', row, viterbi?: boolean}   — one coin path traced (ochre if presented as the Viterbi path)
 *   {kind: 'node', t, s}                    — every coin path through coin state s at toss t (0-based)
 */
export function renderPathTrellis(svgEl, { params, tosses, table, view }) {
  const n = tosses.length;
  const L = layout(n, svgEl.parentNode.clientWidth);
  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${L.width} ${H}`).style('max-width', `${L.width}px`);

  const traced = view.kind === 'row' ? table.rows[view.row].states : null;
  const tracedCls = view.kind === 'row' && view.viterbi ? 'path' : 'sel';

  addMarkers(svg, 't1p-ah', ['plain', 'dim', 'all', 'sel', 'path'], (c) => ({ dim: 'fade', sel: 'sel', path: 'path' })[c] ?? '');

  tosses.forEach((x, c) => {
    svg
      .append('text')
      .attr('class', 'col-head')
      .attr('x', L.colX(c))
      .attr('y', HEAD_Y)
      .attr('text-anchor', 'middle')
      .text(`t = ${c + 1}: ${TOSS_NAMES[x]}`);
  });

  const node = (c, s) => nodePos(L, c, s);
  const arrows = svg.append('g');
  const labels = svg.append('g');
  const baseStyle = view.kind === 'row' ? 'dim' : view.kind === 'all' ? 'all' : 'plain';
  const drawArrow = (a, b, ra, rb, style, label, lp) => {
    const p = arrowPts(a, b, ra, rb);
    arrows
      .append('line')
      .attr('class', `arrow pt-${style}`)
      .attr('x1', p.x1)
      .attr('y1', p.y1)
      .attr('x2', p.x2)
      .attr('y2', p.y2)
      .attr('marker-end', `url(#t1p-ah-${style})`);
    labels.append('text').attr('class', `arrow-label pt-${style}`).attr('x', lp.x).attr('y', lp.y).attr('text-anchor', 'middle').text(label);
  };

  for (let s = 0; s < 2; s++) {
    const style = traced && traced[0] === s ? tracedCls : baseStyle;
    const a = { x: START.x, y: START.y };
    const b = node(0, s);
    drawArrow(a, b, START.r, R, style, fmtProb(params.start[s], 1), startLabelPos(a, b, s));
  }
  for (let c = 1; c < n; c++) {
    for (let s = 0; s < 2; s++) {
      for (let r = 0; r < 2; r++) {
        const style = traced && traced[c - 1] === r && traced[c] === s ? tracedCls : baseStyle;
        const a = node(c - 1, r);
        const b = node(c, s);
        drawArrow(a, b, R, R, style, fmtProb(params.trans[r][s], 2), arrowLabelPos(a, b, r, s));
      }
    }
  }
  arrows.selectAll('line.pt-sel, line.pt-path').raise();

  const sg = svg.append('g').attr('class', 'start-node');
  sg.append('circle').attr('cx', START.x).attr('cy', START.y).attr('r', START.r);
  sg.append('text').attr('x', START.x).attr('y', START.y + 4).attr('text-anchor', 'middle').text('start');

  for (let c = 0; c < n; c++) {
    for (let s = 0; s < 2; s++) {
      const p = node(c, s);
      let mark = '';
      if (traced && traced[c] === s) mark = view.viterbi ? 'on-path' : 'pt-node-sel';
      else if (view.kind === 'node' && view.t === c && view.s === s) mark = 'pt-node-sel';
      const g = svg.append('g').attr('class', `node st-${STATE_LETTERS[s]} ${mark}`);
      g.append('circle').attr('cx', p.x).attr('cy', p.y).attr('r', R);
      g.append('text').attr('class', 'node-name').attr('x', p.x).attr('y', p.y - 3).attr('text-anchor', 'middle').text(STATE_NAMES[s]);
      g.append('text')
        .attr('class', 'node-emit pt-emit')
        .attr('x', p.x)
        .attr('y', p.y + 14)
        .attr('text-anchor', 'middle')
        .text(fmtProb(params.emit[s][tosses[c]], 1));
    }
  }
}

/** The line under the trellis (HTML). */
export function pathTrellisLine({ table, tosses, view }) {
  const tossStr = tosses.map((x) => TOSS_LETTERS[x]).join(' ');
  if (view.kind === 'all') return T.trellisAll({ nRows: table.rows.length, tosses: tossStr, likelihood: fixed4(table.likelihood) });
  if (view.kind === 'node') {
    const r = posteriorByFiltering(table, view.t);
    return T.trellisNode({ t: view.t + 1, count: r.rows.length, numerator: fixed4(r.numerator) });
  }
  if (view.kind === 'row') {
    const row = table.rows[view.row];
    const path = row.states.map((s) => `<span class="st st-${STATE_LETTERS[s]}">${STATE_LETTERS[s]}</span>`).join(' ');
    const factors = row.factors
      .map((f) => `<span class="pt-factor">${fmtProb(f.trans, f.isStart ? 1 : 2)} · <span class="pt-emit-txt">${fmtProb(f.emit, 1)}</span></span>`)
      .join(' × ');
    return T.trellisRow({ path, tosses: tossStr, factors, joint: fixed4(row.joint), viterbi: !!view.viterbi });
  }
  return `<span class="pt-idle">${T.trellisIdle}</span>`;
}
