// "Long sequences" — the precision comparison drawn: how small the forward value gets (cause), where
// naive breaks (consequences, as strips on the same x-axis), and what each method stores instead (hover).
import * as d3 from 'd3';
import { tab2 as T } from '../../content/text.js';
import { fmtLn, sciFromLog } from '../../hmm/format.js';
import { STATE_LETTERS } from '../../hmm/model.js';

const LOG10 = Math.LN10;
const FLOOR_NORMAL = Math.log10(2.2250738585072014e-308); // ≈ −307.65: smallest normal double
const FLOOR_ZERO = Math.log10(4.9406564584124654e-324); // ≈ −323.3: below this a double is exactly 0
const ZERO_LANE = -338; // where "stored as exactly 0" is drawn
const M = { top: 14, right: 150, bottom: 30, left: 150 };
const H = 250;
const STRIP_H = 14;
const STRIP_GAP = 6;

/** Runs of identical values: [[start, endExclusive, value], …] */
function runs(arr) {
  const out = [];
  let start = 0;
  for (let i = 1; i <= arr.length; i++) {
    if (i === arr.length || arr[i] !== arr[start]) {
      out.push([start, i, arr[start]]);
      start = i;
    }
  }
  return out;
}

/**
 * At each toss, the smallest number naive has to store: whichever of αₜ(F), αₜ(B), δₜ(F), δₜ(B) is
 * smallest (δ ≤ α, so usually a δ). Its first exact 0 is the precision table's "first underflow".
 * Returns, per toss: which value it is, its true ln (from log-space), and what naive and rescaled store.
 */
export function smallestStored(report) {
  const { fb, vit } = report;
  return fb.log.alpha.map((_, t) => {
    let best = null;
    for (const kind of ['α', 'δ']) {
      for (const s of [0, 1]) {
        const ln = kind === 'α' ? fb.log.alpha[t][s] : vit.log.columns[t].value[s];
        if (!Number.isFinite(ln) || (best && ln >= best.ln)) continue;
        best = {
          kind,
          s,
          ln,
          naive: kind === 'α' ? fb.naive.alpha[t][s] : vit.naive.columns[t].value[s],
          resc: kind === 'α' ? fb.rescaled.alpha[t][s] : vit.rescaled.columns[t].value[s],
        };
      }
    }
    return best;
  });
}

/** Where the true ln α would cross the floors if the sequence went on at its average rate. */
export function projectCrossing(trueLog10) {
  const n = trueLog10.length;
  const first = trueLog10.findIndex(Number.isFinite);
  if (first < 0 || n - first < 2 || !Number.isFinite(trueLog10[n - 1])) return null;
  const slope = (trueLog10[n - 1] - trueLog10[first]) / (n - 1 - first);
  if (!(slope < 0)) return null;
  const at = (y) => Math.ceil(n + (y - trueLog10[n - 1]) / slope);
  return { slope, normal: at(FLOOR_NORMAL), zero: at(FLOOR_ZERO) };
}

export function mountPrecisionChart(el) {
  el.innerHTML = `
    <div class="pc-legend legend-line">
      <span class="lg-item"><span class="sw sw-line sw-true"></span>${T.pcTrue}</span>
      <span class="lg-item"><span class="sw sw-line sw-naive"></span>${T.pcNaive}</span>
      <span class="lg-item"><span class="sw sw-line sw-resc"></span>${T.pcRescaled}</span>
      <span class="lg-item"><span class="sw sw-box sw-sub"></span>${T.pcSubnormal}</span>
    </div>
    <div class="chart-wrap"><svg class="prec-svg" role="img" aria-label="${T.pcAria}"></svg></div>
    <div class="prec-readout" id="prec-readout" aria-live="polite"></div>
    <p class="note" id="prec-note"></p>`;
  const svg = d3.select(el.querySelector('svg'));
  const wrap = el.querySelector('.chart-wrap');
  const readout = el.querySelector('#prec-readout');
  let api = null;

  function render(report, tosses) {
    const n = tosses.length;
    const { fb, vit } = report;
    const small = smallestStored(report);
    const trueLog10 = small.map((v) => (v ? v.ln / LOG10 : NaN));
    const naive = small.map((v) => (v ? v.naive : NaN));
    const resc = small.map((v) => (v ? v.resc : NaN));
    const first = report.methods.naive.firstUnderflow;
    const proj = first === null ? projectCrossing(trueLog10) : null;

    // strips: which tosses each method gets wrong
    const nanPost = Array.from(fb.naive.posterior, (v) => !Number.isFinite(v));
    const naivePathOff = vit.naive.path.map((s, t) => s !== vit.log.path[t]);
    const stableOff = Array.from(fb.rescaled.posterior, (v, t) => {
      const w = fb.log.posterior[t];
      return !(Math.abs(v - w) <= 1e-9 * Math.max(1, Math.abs(w))) || vit.rescaled.path[t] !== vit.log.path[t];
    });
    const strips = [
      { key: 'nan', label: T.stripNaive, bad: nanPost },
      { key: 'differs', label: T.stripNaivePath, bad: naivePathOff },
      { key: 'stable', label: T.stripStable, bad: stableOff },
    ];

    const width = Math.max(560, wrap.clientWidth);
    const w = width - M.left - M.right;
    const stripsTop = H + 18;
    const height = stripsTop + strips.length * (STRIP_H + STRIP_GAP) + M.bottom;
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const xMax = proj && proj.zero > n ? Math.min(proj.zero + Math.ceil(proj.zero * 0.04), 20 * n) : n;
    const x = d3.scaleLinear().domain([1, Math.max(2, xMax)]).range([0, w]);
    const y = d3.scaleLinear().domain([ZERO_LANE - 4, 6]).range([H - M.top, 0]);
    const root = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);
    svg.append('defs').append('clipPath').attr('id', 'pr-clip').append('rect').attr('x', -2).attr('y', -2).attr('width', w + 4).attr('height', H - M.top + 2);

    // floors
    root.append('rect').attr('class', 'pr-sub').attr('x', 0).attr('width', w).attr('y', y(FLOOR_NORMAL)).attr('height', y(FLOOR_ZERO) - y(FLOOR_NORMAL));
    root.append('rect').attr('class', 'pr-zero').attr('x', 0).attr('width', w).attr('y', y(FLOOR_ZERO)).attr('height', y(ZERO_LANE - 4) - y(FLOOR_ZERO));
    root.append('line').attr('class', 'pr-floor').attr('x1', 0).attr('x2', w).attr('y1', y(FLOOR_NORMAL)).attr('y2', y(FLOOR_NORMAL));
    root.append('text').attr('class', 'pr-floor-lab').attr('x', w + 6).attr('y', y(FLOOR_NORMAL) + 4).text(T.pcFloor);
    root.append('text').attr('class', 'pr-zero-lab').attr('x', w + 6).attr('y', y(ZERO_LANE) + 4).text(T.pcZeroLane);
    root.append('line').attr('class', 'pr-one').attr('x1', 0).attr('x2', w).attr('y1', y(0)).attr('y2', y(0));

    // axes
    const yTicks = [0, -50, -100, -150, -200, -250, -300];
    root.append('g').attr('class', 'pc-axis').call(d3.axisLeft(y).tickValues(yTicks).tickFormat((v) => (v === 0 ? '1' : `10${supNum(v)}`)).tickSizeOuter(0));
    root.append('text').attr('class', 'pc-axis-title').attr('transform', `translate(${-58},${(H - M.top) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text(T.pcYTitle);

    // lines
    const line = d3.line().defined((d) => Number.isFinite(d[1])).x((d) => x(d[0])).y((d) => y(d[1]));
    const trueData = trueLog10.map((v, t) => [t + 1, v]);
    const plot = root.append('g').attr('clip-path', 'url(#pr-clip)');
    plot.append('path').attr('class', 'pr-true').attr('d', line(trueData));
    if (proj) {
      const last = trueData[n - 1];
      plot.append('path').attr('class', 'pr-proj').attr('d', line([last, [proj.zero, FLOOR_ZERO]]));
      // same event as "naive hits 0" after Try n = 2000: the value is stored as exactly 0
      root.append('line').attr('class', 'pr-proj-mark').attr('x1', x(proj.zero)).attr('x2', x(proj.zero)).attr('y1', y(FLOOR_NORMAL) - 10).attr('y2', y(ZERO_LANE));
      root
        .append('text')
        .attr('class', 'pr-proj-lab')
        .attr('x', x(proj.zero) - 6)
        .attr('y', y(FLOOR_NORMAL) - 14)
        .attr('text-anchor', 'end')
        .text(T.pcProjLabel(proj.zero));
    }
    // naive: the true value until it is stored as 0, then in the "= 0" lane
    const naiveData = naive.map((v, t) => [t + 1, v > 0 ? Math.log10(v) : ZERO_LANE]);
    plot.append('path').attr('class', 'pr-naive').attr('d', line(naiveData));
    // rescaled stores a number between 0 and 1
    plot.append('path').attr('class', 'pr-resc').attr('d', line(resc.map((v, t) => [t + 1, v > 0 ? Math.log10(v) : NaN])));
    root.append('text').attr('class', 'pr-resc-lab').attr('x', x(n)).attr('y', y(0) - 6).attr('text-anchor', 'end').text(T.pcRescLabel);

    if (first !== null) {
      const g = root.append('g').attr('class', 'pr-under').attr('data-link', 'underflow');
      g.append('line').attr('x1', x(first)).attr('x2', x(first)).attr('y1', 0).attr('y2', stripsTop - M.top + strips.length * (STRIP_H + STRIP_GAP));
      g.append('text').attr('x', x(first) + 5).attr('y', 36).text(T.pcFirstUnderflow(first));
    }

    // x axis (between chart and strips)
    root
      .append('g')
      .attr('class', 'pc-axis')
      .attr('transform', `translate(0,${H - M.top})`)
      .call(d3.axisBottom(x).ticks(Math.min(10, Math.floor(w / 80))).tickFormat(d3.format('d')).tickSizeOuter(0));

    // strips
    strips.forEach((st, i) => {
      const yy = stripsTop - M.top + 6 + i * (STRIP_H + STRIP_GAP);
      const g = root.append('g').attr('class', `pr-strip`).attr('data-link', st.key);
      g.append('text').attr('class', 'pr-strip-lab').attr('x', -8).attr('y', yy + STRIP_H - 3).attr('text-anchor', 'end').text(st.label);
      for (const [a, b, bad] of runs(st.bad)) {
        g.append('rect')
          .attr('class', bad ? 'bad' : 'ok')
          .attr('x', x(a + 1) - (n > 1 ? (x(2) - x(1)) / 2 : 0))
          .attr('width', Math.max(1, (b - a) * (n > 1 ? x(2) - x(1) : w)))
          .attr('y', yy)
          .attr('height', STRIP_H);
      }
      const count = st.bad.filter(Boolean).length;
      g.append('text').attr('class', `pr-strip-count ${count ? 'bad' : ''}`).attr('x', x(n) + 8).attr('y', yy + STRIP_H - 3).text(count ? T.stripBadCount(count) : T.stripOk);
    });

    // hover: one toss, three stored values
    const rule = root.append('line').attr('class', 'pr-rule').attr('y1', 0).attr('y2', stripsTop - M.top + strips.length * (STRIP_H + STRIP_GAP));
    const show = (t) => {
      rule.attr('x1', x(t + 1)).attr('x2', x(t + 1));
      const v = small[t];
      if (!v) return;
      readout.innerHTML = T.readout({
        t: t + 1,
        toss: tosses[t] === 0 ? 'Head' : 'Tail',
        what: `${v.kind}<sub>${t + 1}</sub>(${STATE_LETTERS[v.s]})`,
        trueVal: sciFromLog(v.ln, 2),
        naive: v.naive > 0 ? sciFromLog(Math.log(v.naive), 2) : '0',
        naiveZero: !(v.naive > 0),
        resc: v.resc.toPrecision(3),
        cum: fmtLn(v.ln - Math.log(v.resc), 1), // what the scale factors divided out
        lnA: fmtLn(v.ln, 1),
      });
    };
    root
      .append('rect')
      .attr('class', 'pr-hit')
      .attr('width', x(n) + 1)
      .attr('height', stripsTop - M.top + strips.length * (STRIP_H + STRIP_GAP))
      .on('mousemove', (ev) => {
        const [px] = d3.pointer(ev);
        show(Math.max(0, Math.min(n - 1, Math.round(x.invert(px)) - 1)));
      });
    show(first !== null ? first - 1 : n - 1);

    el.querySelector('#prec-note').textContent =
      first !== null ? T.pcNoteFailed({ first, n }) : proj ? T.pcNoteSurvives({ n, at: sciFromLog(small[n - 1].ln, 2), normal: proj.normal, zero: proj.zero }) : T.pcNoteFlat;
    api = { highlight: (key) => svg.selectAll('[data-link]').classed('linked', function () { return this.dataset.link === key; }) };
  }

  return { render, highlight: (key) => api?.highlight(key) };
}

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
const supNum = (v) => String(v).split('').map((c) => SUP[c] ?? c).join('');
