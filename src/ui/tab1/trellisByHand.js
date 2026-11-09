// Stage 3 — trellis by hand (matches docs/img/hidden_path.png).
import * as d3 from 'd3';
import { tab1 as T } from '../../content/text.js';
import { sig3, fmtProb, fixed4, sub } from '../../hmm/format.js';
import { STATE_LETTERS, STATE_NAMES, TOSS_LETTERS, TOSS_NAMES } from '../../hmm/model.js';
import { recursionLine, firstLine, plainLine, sym, stateSpan } from '../equation.js';

const R = 36;
const ROW_Y = [105, 265];
const START = { x: 55, y: 185, r: 24 };
const COL_X0 = 200;
const H = 320;

/** Total number of Next steps in stage 3 for the given mode. */
export function stage3Steps(mode, n) {
  return mode === 'max' ? 3 * n : 2 * n + 1;
}

/** Decode a stage-3 step into its parts. */
export function decodeStep(mode, n, s3) {
  const computed = Math.min(s3, 2 * n);
  const backtrack = mode === 'max' ? Math.max(0, s3 - 2 * n) : 0;
  const total = mode === 'sum' && s3 === 2 * n + 1;
  return { computed, backtrack, total };
}

function layout(n) {
  const gap = n === 1 ? 0 : Math.min(300, 640 / (n - 1));
  const width = COL_X0 + (n - 1) * gap + 80;
  return { width, colX: (k) => COL_X0 + k * gap };
}

function ensureDefs(svg) {
  const defs = svg.append('defs');
  const mk = (id, cls) =>
    defs
      .append('marker')
      .attr('id', id)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 9)
      .attr('markerHeight', 9)
      .attr('markerUnits', 'userSpaceOnUse')
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M0,0 L10,5 L0,10 z')
      .attr('class', `ah ${cls}`);
  ['win', 'lose', 'fade', 'pending', 'sum', 'path'].forEach((c) => mk(`t1-ah-${c}`, c));
}

function arrowPts(a, b, ra, rb) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  return { x1: a.x + ux * (ra + 2), y1: a.y + uy * (ra + 2), x2: b.x - ux * (rb + 3), y2: b.y - uy * (rb + 3) };
}

/**
 * Render stage 3.
 * ctx: { svgEl, titleEl, eqEl, captionEl, params, tosses, vit, fb, mode, s3 }
 * Returns { done: boolean } — whether the stage's final step is shown.
 */
export function renderTrellisStage(ctx) {
  const { params, tosses, vit, fb, mode, s3 } = ctx;
  const n = tosses.length;
  const { computed, backtrack, total } = decodeStep(mode, n, s3);
  const L = layout(n);
  const tossStr = tosses.map((x) => TOSS_LETTERS[x]).join(' ');
  const letter = mode === 'max' ? 'δ' : 'α';
  const value = (c, s) => (mode === 'max' ? Math.exp(vit.columns[c].logDelta[s]) : Math.exp(fb.logAlpha[c][s]));
  const isComputed = (c, s) => 2 * c + s < computed;
  const curCol = backtrack > 0 ? n - backtrack : total ? null : computed > 0 ? Math.floor((computed - 1) / 2) : null;
  const onPath = (c) => mode === 'max' && backtrack > 0 && c >= n - backtrack;
  const path = vit.path;

  // title
  const titleT = curCol === null ? (total ? n : 1) : curCol + 1;
  ctx.titleEl.textContent = T.trellisTitle({ mode, t: titleT, tosses: tossStr });

  // ── SVG ──
  const svg = d3.select(ctx.svgEl);
  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${L.width} ${H}`).style('max-width', `${L.width}px`);
  ensureDefs(svg);

  if (curCol !== null) {
    svg
      .append('rect')
      .attr('class', 'col-highlight')
      .attr('x', L.colX(curCol) - R - 14)
      .attr('y', 14)
      .attr('width', 2 * R + 28)
      .attr('height', H - 22)
      .attr('rx', 10);
  }

  // column headers
  tosses.forEach((x, c) => {
    svg
      .append('text')
      .attr('class', 'col-head')
      .attr('x', L.colX(c))
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .text(`t = ${c + 1}: ${TOSS_NAMES[x]}`);
  });

  const node = (c, s) => ({ x: L.colX(c), y: ROW_Y[s] });
  const arrows = svg.append('g').attr('class', 'arrows');
  const labels = svg.append('g').attr('class', 'arrow-labels');

  const drawArrow = (a, b, ra, rb, style, label, labelPos) => {
    const p = arrowPts(a, b, ra, rb);
    arrows
      .append('line')
      .attr('class', `arrow ${style}`)
      .attr('x1', p.x1)
      .attr('y1', p.y1)
      .attr('x2', p.x2)
      .attr('y2', p.y2)
      .attr('marker-end', `url(#t1-ah-${style})`);
    labels
      .append('text')
      .attr('class', `arrow-label ${style}`)
      .attr('x', labelPos.x)
      .attr('y', labelPos.y)
      .attr('text-anchor', 'middle')
      .text(label);
  };

  // start arrows
  for (let s = 0; s < 2; s++) {
    let style = isComputed(0, s) ? (mode === 'max' ? 'win' : 'sum') : 'pending';
    if (backtrack === n && path[0] === s) style = 'path';
    const a = { x: START.x, y: START.y };
    const b = node(0, s);
    const mid = { x: (a.x + b.x) / 2 - 8, y: (a.y + b.y) / 2 + (s === 0 ? -14 : 22) };
    drawArrow(a, b, START.r, R, style, fmtProb(params.start[s], 1), mid);
  }

  // transition arrows into column c
  for (let c = 1; c < n; c++) {
    for (let s = 0; s < 2; s++) {
      for (let r = 0; r < 2; r++) {
        let style;
        if (!isComputed(c, s)) style = 'pending';
        else if (mode === 'sum') style = 'sum';
        else if (vit.columns[c].phi[s] === r) style = 'win';
        else style = c === curCol && backtrack === 0 ? 'lose' : 'fade';
        if (onPath(c) && onPath(c - 1) && path[c] === s && path[c - 1] === r) style = 'path';
        const a = node(c - 1, r);
        const b = node(c, s);
        let lp;
        if (r === s) lp = { x: (a.x + b.x) / 2, y: a.y - 9 };
        else {
          const f = 0.3;
          lp = { x: a.x + (b.x - a.x) * f + 20, y: a.y + (b.y - a.y) * f + (r === 0 ? 2 : 12) };
        }
        drawArrow(a, b, R, R, style, fmtProb(params.trans[r][s], 2), lp);
      }
    }
  }
  // draw path/win arrows on top
  arrows.selectAll('line.win, line.sum, line.path').raise();

  // start node
  const sg = svg.append('g').attr('class', 'start-node');
  sg.append('circle').attr('cx', START.x).attr('cy', START.y).attr('r', START.r);
  sg.append('text').attr('x', START.x).attr('y', START.y + 4).attr('text-anchor', 'middle').text('start');

  // coin-state nodes
  for (let c = 0; c < n; c++) {
    for (let s = 0; s < 2; s++) {
      const p = node(c, s);
      const g = svg
        .append('g')
        .attr('class', `node st-${STATE_LETTERS[s]} ${isComputed(c, s) ? 'computed' : ''} ${onPath(c) && path[c] === s ? 'on-path' : ''}`);
      g.append('circle').attr('cx', p.x).attr('cy', p.y).attr('r', R);
      g.append('text').attr('class', 'node-name').attr('x', p.x).attr('y', p.y - 12).attr('text-anchor', 'middle').text(STATE_NAMES[s]);
      g.append('text')
        .attr('class', 'node-emit')
        .attr('x', p.x)
        .attr('y', p.y + 2)
        .attr('text-anchor', 'middle')
        .text(`b = ${fmtProb(params.emit[s][tosses[c]], 1)}`);
      g.append('text')
        .attr('class', 'node-value')
        .attr('x', p.x)
        .attr('y', p.y + 20)
        .attr('text-anchor', 'middle')
        .text(isComputed(c, s) ? sig3(value(c, s)) : '');
    }
  }

  // ── equations + caption ──
  let eq = '';
  let caption;
  const S = (s) => STATE_LETTERS[s];
  const lineFor = (c, s) => {
    const t = c + 1;
    const res = sig3(value(c, s));
    const emit = fmtProb(params.emit[s][tosses[c]], 1);
    if (c === 0) return firstLine({ letter, s: S(s), start: fmtProb(params.start[s], 1), emit, result: res });
    const terms = [0, 1].map((r) => `${sig3(value(c - 1, r))} · ${fmtProb(params.trans[r][s], 2)}`);
    return recursionLine({ mode, letter, t: sub(t), s: S(s), terms, emit, result: res, winner: mode === 'max' ? S(vit.columns[c].phi[s]) : null });
  };

  if (computed === 0) {
    caption = mode === 'max' ? T.maxStart : T.sumStart;
  } else if (backtrack === 0 && !total) {
    const c = curCol;
    for (let s = 0; s < 2; s++) if (isComputed(c, s)) eq += lineFor(c, s);
    const j = computed - 1;
    const s = j % 2;
    const t = c + 1;
    const emit = fmtProb(params.emit[s][tosses[c]], 1);
    const val = sig3(value(c, s));
    if (c === 0) caption = (mode === 'max' ? T.maxFirst : T.sumFirst)({ s: S(s), value: val });
    else {
      const cand = [0, 1].map((r) => sig3(value(c - 1, r) * params.trans[r][s]));
      caption =
        mode === 'max'
          ? T.maxNode({ t: sub(t), s: S(s), fromF: cand[0], fromB: cand[1], winner: S(vit.columns[c].phi[s]), emit, value: val })
          : T.sumNode({ t: sub(t), s: S(s), fromF: cand[0], fromB: cand[1], emit, value: val });
    }
    if (computed === 2 * n) caption += ' ' + (mode === 'max' ? T.maxForwardDone : T.sumForwardDone);
  } else if (total) {
    const a = [0, 1].map((s) => value(n - 1, s));
    eq = plainLine(
      `Pr(${tossStr}) = ${sym('α', sub(n), 'F')} + ${sym('α', sub(n), 'B')} = ${sig3(a[0])} + ${sig3(a[1])} = <strong>${fixed4(a[0] + a[1])}</strong>`,
    );
    caption = T.sumTotal({ n: sub(n), total: fixed4(a[0] + a[1]) });
  } else {
    // backtrack lines, newest last
    const lines = [];
    const fVal = sig3(value(n - 1, 0));
    const bVal = sig3(value(n - 1, 1));
    lines.push(
      plainLine(
        `argmax(${sym('δ', sub(n), 'F')}, ${sym('δ', sub(n), 'B')}) = argmax(${fVal}, ${bVal}) → toss ${n} is ${stateSpan(S(path[n - 1]))}`,
      ),
    );
    for (let b = 2; b <= backtrack; b++) {
      const t = n - b + 2; // column (1-based) whose backpointer we follow
      lines.push(plainLine(`<span class="eq-phi">φ<sub>${sub(t)}</sub>(${stateSpan(S(path[t - 1]))}) = ${stateSpan(S(path[t - 2]))}</span> → toss ${t - 1} is ${stateSpan(S(path[t - 2]))}`));
    }
    eq = lines.join('');
    if (backtrack === 1) caption = T.backtrackFirst({ n: sub(n), fVal, bVal, s: S(path[n - 1]) });
    else {
      const t = n - backtrack + 2;
      caption = T.backtrackStep({ t, tSub: sub(t), s: S(path[t - 1]), prev: S(path[t - 2]) });
    }
    if (backtrack === n) {
      caption += ' ' + T.backtrackDone({ path: path.map(S).join(' '), joint: fixed4(Math.exp(vit.logJoint)) });
    }
  }
  ctx.eqEl.innerHTML = eq;
  ctx.captionEl.textContent = caption;
  return { done: s3 === stage3Steps(mode, n) };
}
