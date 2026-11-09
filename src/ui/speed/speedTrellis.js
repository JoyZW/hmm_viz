// "Speeding it up" — the trellis passes drawn one step at a time (the Viterbi pass matches
// docs/img/hidden_path.png). Q1: forward pass. Q2: forward pass (already filled), backward pass,
// posterior. Q3: Viterbi pass and backtrack. All values are plain probabilities.
import * as d3 from 'd3';
import { speed as T } from '../../content/text.js';
import { sig3, fmtProb, fixed4, sub } from '../../hmm/format.js';
import { F, B, STATE_LETTERS, STATE_NAMES, TOSS_LETTERS, TOSS_NAMES } from '../../hmm/model.js';
import { recursionLine, firstLine, backwardLine, plainLine, sym, stateSpan } from '../equation.js';
import { GEOM_TALL as G, layout, arrowPts, arrowLabelPos, startLabelPos, addMarkers } from '../tab1/trellisGeom.js';

const S = (s) => STATE_LETTERS[s];

/** Everything the views read, as plain probabilities. */
export function speedValues(r1) {
  const { fbN, vit } = r1;
  const n = fbN.alpha.length;
  const L = fbN.alpha[n - 1][F] + fbN.alpha[n - 1][B];
  // "What if?" chain: start the backtrack from the other coin at the last toss and follow φ.
  const alt = new Array(n);
  alt[n - 1] = 1 - vit.path[n - 1];
  for (let t = n - 1; t > 0; t--) alt[t - 1] = vit.columns[t].phi[alt[t]];
  return {
    alt,
    n,
    alpha: fbN.alpha,
    beta: fbN.beta,
    L,
    post: fbN.alpha.map((a, t) => (a[B] * fbN.beta[t][B]) / L),
    delta: vit.columns.map((c) => c.logDelta.map(Math.exp)),
    phi: vit.columns.map((c) => c.phi),
    path: vit.path,
    joint: Math.exp(vit.logJoint),
  };
}

/**
 * Draw the trellis and the equations for step d (from decodeSpeed); returns the caption text.
 * ctx: { svgEl, eqEl, params, tosses, V, q, d }
 */
export function renderSpeedTrellis({ svgEl, eqEl, params, tosses, V, q, d }) {
  const n = tosses.length;
  const L = layout(n, svgEl.parentNode.clientWidth);
  const { R, ROW_Y, START, H, HEAD_Y } = G;
  const tossStr = tosses.map((x) => TOSS_LETTERS[x]).join(' ');
  const fwdVal = (c, s) => (q === 'vit' ? V.delta[c][s] : V.alpha[c][s]);
  const letter = q === 'vit' ? 'δ' : 'α';

  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${L.width} ${H}`).style('max-width', `${L.width}px`);
  addMarkers(svg, 'sp-ah', ['win', 'lose', 'fade', 'pending', 'sum', 'path', 'bwd', 'alt']);

  if (d.curCol !== null) {
    svg
      .append('rect')
      .attr('class', 'col-highlight')
      .attr('x', L.colX(d.curCol) - R - 12)
      .attr('y', 4)
      .attr('width', 2 * R + 24)
      .attr('height', H - 6)
      .attr('rx', 10);
  }
  tosses.forEach((x, c) => {
    svg.append('text').attr('class', 'col-head').attr('x', L.colX(c)).attr('y', HEAD_Y).attr('text-anchor', 'middle').text(`t = ${c + 1}: ${TOSS_NAMES[x]}`);
  });

  const node = (c, s) => ({ x: L.colX(c), y: ROW_Y[s] });
  const arrows = svg.append('g');
  const labels = svg.append('g');
  const drawArrow = (a, b, ra, rb, style, label, lp) => {
    const p = arrowPts(a, b, ra, rb);
    arrows.append('line').attr('class', `arrow ${style}`).attr('x1', p.x1).attr('y1', p.y1).attr('x2', p.x2).attr('y2', p.y2).attr('marker-end', `url(#sp-ah-${style})`);
    labels.append('text').attr('class', `arrow-label ${style}`).attr('x', lp.x).attr('y', lp.y).attr('text-anchor', 'middle').text(label);
  };

  // start arrows
  const showAlt = q === 'vit' && d.backtrack === n; // after the backtrack: the "what if?" chain
  for (let s = 0; s < 2; s++) {
    let style = d.isA(0, s) ? (q === 'vit' ? 'win' : 'sum') : 'pending';
    if (showAlt && V.alt[0] === s && V.path[0] !== s) style = 'alt';
    if (q === 'vit' && d.backtrack === n && V.path[0] === s) style = 'path';
    const a = { x: START.x, y: START.y };
    const b = node(0, s);
    drawArrow(a, b, START.r, R, style, fmtProb(params.start[s], 1), startLabelPos(a, b, s));
  }
  // transition arrows into column c
  for (let c = 1; c < n; c++) {
    for (let s = 0; s < 2; s++) {
      for (let r = 0; r < 2; r++) {
        let style;
        if (q === 'vit') {
          if (!d.isA(c, s)) style = 'pending';
          else if (V.phi[c][s] === r) style = 'win';
          else style = c === d.curCol && d.backtrack === 0 ? 'lose' : 'fade';
          if (showAlt && V.alt[c] === s && V.alt[c - 1] === r) style = 'alt';
          if (d.onPath(c) && d.onPath(c - 1) && V.path[c] === s && V.path[c - 1] === r) style = 'path';
        } else if (d.isB(c - 1, r)) style = 'bwd'; // used by β of the node it leaves
        else style = d.isA(c, s) ? 'sum' : 'pending';
        const a = node(c - 1, r);
        const b = node(c, s);
        drawArrow(a, b, R, R, style, fmtProb(params.trans[r][s], 2), arrowLabelPos(a, b, r, s));
      }
    }
  }
  arrows.selectAll('line.win, line.sum, line.bwd, line.alt, line.path').raise();

  const sg = svg.append('g').attr('class', 'start-node');
  sg.append('circle').attr('cx', START.x).attr('cy', START.y).attr('r', START.r);
  sg.append('text').attr('x', START.x).attr('y', START.y + 4).attr('text-anchor', 'middle').text('start');

  // nodes
  for (let c = 0; c < n; c++) {
    for (let s = 0; s < 2; s++) {
      const p = node(c, s);
      const onPath = q === 'vit' && d.onPath(c) && V.path[c] === s;
      // where the backtrack stands: the last column at step 1, then the node whose φ is being read
      const btCol = d.backtrack === 1 ? n - 1 : n - d.backtrack + 1;
      const btHere = q === 'vit' && d.phase === 'bt' && c === btCol && V.path[c] === s;
      const onAlt = showAlt && V.alt[c] === s && !onPath;
      const g = svg.append('g').attr('class', `node sp-node st-${S(s)} ${onPath ? 'on-path' : ''} ${btHere ? 'bt-here' : ''} ${onAlt ? 'on-alt' : ''}`);
      g.append('circle').attr('cx', p.x).attr('cy', p.y).attr('r', R);
      const twoValues = q === 'post' || q === 'vit';
      g.append('text').attr('class', 'node-name').attr('x', p.x).attr('y', p.y - (twoValues ? 19 : 14)).attr('text-anchor', 'middle').text(STATE_NAMES[s]);
      g.append('text').attr('class', 'node-emit').attr('x', p.x).attr('y', p.y - (twoValues ? 6 : 1)).attr('text-anchor', 'middle').text(`b = ${fmtProb(params.emit[s][tosses[c]], 1)}`);
      if (q === 'post') {
        g.append('text').attr('class', 'node-value val-a').attr('x', p.x).attr('y', p.y + 10).attr('text-anchor', 'middle').text(d.isA(c, s) ? `α ${sig3(V.alpha[c][s])}` : '');
        g.append('text').attr('class', 'node-value val-b').attr('x', p.x).attr('y', p.y + 25).attr('text-anchor', 'middle').text(d.isB(c, s) ? `β ${sig3(V.beta[c][s])}` : '');
      } else if (q === 'vit') {
        // δ and, from toss 2 on, the backpointer φ: where the best path into this node came from
        g.append('text').attr('class', 'node-value val-a').attr('x', p.x).attr('y', p.y + 10).attr('text-anchor', 'middle').text(d.isA(c, s) ? `δ ${sig3(V.delta[c][s])}` : '');
        const phiTxt = g.append('text').attr('class', 'node-value val-phi').attr('x', p.x).attr('y', p.y + 25).attr('text-anchor', 'middle');
        if (d.isA(c, s) && c > 0) {
          phiTxt.append('tspan').text('φ = ');
          phiTxt.append('tspan').attr('class', `phi-st st-${S(V.phi[c][s])}`).text(S(V.phi[c][s]));
        }
      } else {
        g.append('text').attr('class', 'node-value').attr('x', p.x).attr('y', p.y + 17).attr('text-anchor', 'middle').text(d.isA(c, s) ? `${letter} ${sig3(fwdVal(c, s))}` : '');
      }
    }
    // posterior bar under the Biased node
    if (q === 'post' && d.hasPost(c)) {
      const x0 = L.colX(c) - R;
      const y0 = ROW_Y[1] + R + 7;
      svg.append('rect').attr('class', 'post-bg').attr('x', x0).attr('y', y0).attr('width', 2 * R).attr('height', 7).attr('rx', 3);
      svg.append('rect').attr('class', 'post-fg').attr('x', x0).attr('y', y0).attr('width', 2 * R * V.post[c]).attr('height', 7).attr('rx', 3);
      svg.append('text').attr('class', 'post-lab').attr('x', L.colX(c)).attr('y', y0 + 21).attr('text-anchor', 'middle').text(`Pr(B) = ${sig3(V.post[c])}`);
    }
  }

  // ── equations + caption ──
  const emitOf = (c, s) => fmtProb(params.emit[s][tosses[c]], 1);
  const pending = (html) => html.replace('class="eq-line"', 'class="eq-line pending"');
  const fwdLine = (c, s) => {
    if (!d.isA(c, s)) return pending(fwdLineFor(c, s, '?', '?'));
    return fwdLineFor(c, s, sig3(fwdVal(c, s)), q === 'vit' && c > 0 ? S(V.phi[c][s]) : null);
  };
  const fwdLineFor = (c, s, res, winner) => {
    if (c === 0) return firstLine({ letter, s: S(s), start: fmtProb(params.start[s], 1), emit: emitOf(c, s), result: res });
    const terms = [0, 1].map((r) => `${sig3(fwdVal(c - 1, r))} · ${fmtProb(params.trans[r][s], 2)}`);
    const mode = q === 'vit' ? 'max' : 'sum';
    return recursionLine({ mode, letter, t: sub(c + 1), s: S(s), terms, emit: emitOf(c, s), result: res, winner: mode === 'max' ? winner : null });
  };
  const bwdTerms = (c, s) => [0, 1].map((r) => `${fmtProb(params.trans[s][r], 2)} · ${emitOf(c + 1, r)} · ${sig3(V.beta[c + 1][r])}`);
  const bwdLine = (c, s) =>
    d.isB(c, s)
      ? backwardLine({ t: sub(c + 1), s: S(s), terms: bwdTerms(c, s), result: sig3(V.beta[c][s]) })
      : pending(backwardLine({ t: sub(c + 1), s: S(s), terms: bwdTerms(c, s), result: '?' }));
  const postLine = (c, s) =>
    plainLine(
      `Pr(${s === B ? 'B' : 'F'} at toss ${c + 1}) = ${sym('α', sub(c + 1), S(s))} · ${sym('β', sub(c + 1), S(s))} / Pr(${tossStr}) = ${sig3(V.alpha[c][s])} · ${sig3(V.beta[c][s])} / ${fixed4(V.L)} = <strong>${sig3(s === B ? V.post[c] : 1 - V.post[c])}</strong>`,
    );

  let eq = '';
  let caption = '';
  const nSub = sub(n);
  switch (d.phase) {
    case 'intro':
      caption = q === 'vit' ? T.maxStart : T.sumStart;
      break;
    case 'fwd': {
      const { c, s } = d.curNode;
      eq = fwdLine(c, F) + fwdLine(c, B); // both coins, the one not yet computed greyed
      const val = sig3(fwdVal(c, s));
      if (c === 0) caption = (q === 'vit' ? T.maxFirst : T.sumFirst)({ s: S(s), value: val });
      else {
        const cand = [0, 1].map((r) => sig3(fwdVal(c - 1, r) * params.trans[r][s]));
        const common = { t: sub(c + 1), s: S(s), fromF: cand[0], fromB: cand[1], emit: emitOf(c, s), value: val };
        caption = q === 'vit' ? T.maxNode({ ...common, winner: S(V.phi[c][s]) }) : T.sumNode(common);
      }
      if (d.fwd === 2 * n) caption += ' ' + (q === 'vit' ? T.maxForwardDone : q === 'post' ? T.postForwardDone : T.sumForwardDone);
      break;
    }
    case 'total':
    case 'ready': {
      const a = [0, 1].map((s) => V.alpha[n - 1][s]);
      eq = plainLine(`Pr(${tossStr}) = ${sym('α', nSub, 'F')} + ${sym('α', nSub, 'B')} = ${sig3(a[0])} + ${sig3(a[1])} = <strong>${fixed4(V.L)}</strong>`);
      caption = d.phase === 'total' ? `${T.sumTotal({ n: nSub, total: fixed4(V.L) })} ${T.longNote}` : T.postReady({ n: nSub, L: fixed4(V.L) });
      break;
    }
    case 'binit':
      eq = plainLine(`${sym('β', nSub, 'F')} = ${sym('β', nSub, 'B')} = <strong>1</strong>`);
      caption = T.bInit({ n: nSub });
      if (n === 1) caption += ' ' + T.bwdDone;
      break;
    case 'bwd': {
      const { c, s } = d.curNode;
      eq = bwdLine(c, F) + bwdLine(c, B);
      const parts = [0, 1].map((r) => sig3(params.trans[s][r] * params.emit[r][tosses[c + 1]] * V.beta[c + 1][r]));
      caption = T.bwdNode({ t: c + 1, tSub: sub(c + 1), s: S(s), next: c + 2, nextToss: TOSS_NAMES[tosses[c + 1]], toF: parts[0], toB: parts[1], value: sig3(V.beta[c][s]) });
      if (d.bwd === 2 * (n - 1)) caption += ' ' + T.bwdDone;
      break;
    }
    case 'post': {
      const c = d.curCol;
      eq = postLine(c, B) + postLine(c, F);
      caption = T.postStep({ t: c + 1, pB: sig3(V.post[c]), pF: sig3(1 - V.post[c]) });
      if (d.post === n) caption += ` ${T.postDone} ${T.longNote}`;
      break;
    }
    case 'bt': {
      // the chain so far, one line per backtrack step, newest last
      const fVal = sig3(V.delta[n - 1][F]);
      const bVal = sig3(V.delta[n - 1][B]);
      const lines = [
        plainLine(`toss ${n}: larger of ${sym('δ', nSub, 'F')} = ${fVal}, ${sym('δ', nSub, 'B')} = ${bVal} &nbsp;→&nbsp; ${stateSpan(S(V.path[n - 1]))}`),
      ];
      for (let b = 2; b <= d.backtrack; b++) {
        const t = n - b + 2; // the toss whose backpointer we read (1-based)
        lines.push(plainLine(`toss ${t - 1}: <span class="eq-phi-read">φ<sub>${sub(t)}</sub>(${stateSpan(S(V.path[t - 1]))}) = ${stateSpan(S(V.path[t - 2]))}</span> &nbsp;→&nbsp; ${stateSpan(S(V.path[t - 2]))}`));
      }
      if (d.backtrack === n && n > 1) {
        const steps = [];
        for (let t = n; t > 1; t--) steps.push(`φ<sub>${sub(t)}</sub>(${stateSpan(S(V.alt[t - 1]))}) = ${stateSpan(S(V.alt[t - 2]))}`);
        lines.push(
          `<div class="eq-line eq-alt">what if toss ${n} were ${stateSpan(S(V.alt[n - 1]))}? ${steps.join(', ')} → ${V.alt.map((x) => stateSpan(S(x))).join(' ')}, only ${sig3(V.delta[n - 1][V.alt[n - 1]])} &lt; ${sig3(V.joint)}</div>`,
        );
      }
      eq = lines.join('');
      if (d.backtrack === 1) caption = T.backtrackFirst({ n: nSub, fVal, bVal, s: S(V.path[n - 1]) });
      else {
        const t = n - d.backtrack + 2;
        caption = T.backtrackStep({ t, tSub: sub(t), s: S(V.path[t - 1]), prev: S(V.path[t - 2]) });
      }
      if (d.backtrack === n) {
        caption += ` ${T.backtrackDone({ path: V.path.map(S).join(' '), joint: fixed4(V.joint) })}`;
        if (n > 1) caption += ` ${T.backtrackAlt({ n, s: S(V.alt[n - 1]), alt: V.alt.map(S).join(' '), value: sig3(V.delta[n - 1][V.alt[n - 1]]) })}`;
        caption += ` ${T.longNote}`;
      }
      break;
    }
  }
  eqEl.innerHTML = eq;
  return caption;
}
