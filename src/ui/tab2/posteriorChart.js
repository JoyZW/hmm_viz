// Tab 2 — posterior chart (matches docs/img/posterior-chart.png at short lengths).
import * as d3 from 'd3';
import { tab2 as T } from '../../content/text.js';

const M = { top: 12, right: 18, bottom: 58, left: 52 };
const HEIGHT = 300;
const MARKER_LIMIT = 100;

/** Tosses (1-based) where the Viterbi path differs from the per-toss most likely coin; 0.5 is never a disagreement. */
export function disagreements(posterior, path) {
  const out = [];
  for (let t = 0; t < path.length; t++) {
    const q = posterior[t];
    if (q === 0.5) continue;
    if ((q > 0.5 ? 1 : 0) !== path[t]) out.push(t + 1);
  }
  return out;
}

export function mountPosteriorChart(el, { onPickToss, onZoom }) {
  el.innerHTML = `
    <p class="chart-agree" id="pc-agree"></p>
    <div class="legend">
      <div class="legend-line">
        <span class="lg-item"><span class="sw sw-line sw-post"></span>${T.legendPosterior}</span>
        <span class="lg-item"><span class="sw sw-line sw-vit"></span>${T.legendViterbi} <span class="pending-note" id="pc-vit-pending">${T.legendViterbiPending}</span></span>
      </div>
      <div class="legend-line">
        <span class="lg-title">${T.legendToss}</span>
        <span class="lg-item"><span class="sw sw-dot hollow"></span>Head</span>
        <span class="lg-item"><span class="sw sw-dot filled"></span>Tail</span>
        <span class="lg-item"><span class="sw sw-box sw-dis"></span>${T.legendDisagree}</span>
        <span class="lg-item"><span class="sw sw-box sw-win"></span>${T.legendWindow}</span>
      </div>
    </div>
    <div class="chart-tools">
      <button type="button" class="btn small" id="pc-showall">${T.showAll}</button>
      <span class="hint">${T.chartHelp}</span>
    </div>
    <div class="chart-wrap"><svg class="pc-svg" role="img" aria-label="Posterior probability of the Biased coin at each toss, with the Viterbi path"></svg></div>
    <p class="note" id="pc-note"></p>`;

  const svg = d3.select(el.querySelector('svg'));
  const wrap = el.querySelector('.chart-wrap');
  el.querySelector('#pc-showall').addEventListener('click', () => onZoom(null));

  let x = null;
  let bandSel = null;
  let lastWindow = null;

  function updateBand(win) {
    lastWindow = win;
    if (!x || !bandSel || !win) return;
    const [a, b] = win;
    const [d0, d1] = x.domain();
    const lo = Math.max(d0, a - 0.5);
    const hi = Math.min(d1, b + 0.5);
    bandSel
      .attr('x', x(lo))
      .attr('width', Math.max(0, x(hi) - x(lo)))
      .attr('display', hi > lo ? null : 'none');
  }

  /**
   * v: { tosses, posterior, path, showViterbi, zoom: [a,b]|null (1-based), window: [a,b] (1-based), truePath }
   */
  function render(v) {
    const n = v.tosses.length;
    const width = Math.max(320, wrap.clientWidth);
    const w = width - M.left - M.right;
    const h = HEIGHT - M.top - M.bottom;
    svg.attr('viewBox', `0 0 ${width} ${HEIGHT}`).attr('width', width).attr('height', HEIGHT);
    svg.selectAll('*').remove();

    const [a, b] = v.zoom ?? [1, n];
    const pad = Math.max(0.6, (b - a) * 0.02);
    x = d3.scaleLinear().domain([a - pad, b + pad]).range([0, w]);
    const y = d3.scaleLinear().domain([-0.04, 1.04]).range([h, 0]);
    const visible = b - a + 1;
    const showMarkers = visible <= MARKER_LIMIT;

    const clipId = 'pc-clip';
    svg.append('defs').append('clipPath').attr('id', clipId).append('rect').attr('width', w).attr('height', h);
    const root = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);
    root.append('rect').attr('class', 'pc-bg').attr('width', w).attr('height', h);

    // gridlines
    const xt = visible <= 30 ? d3.range(Math.ceil(a), Math.floor(b) + 1) : x.ticks(Math.min(12, Math.floor(w / 70))).filter(Number.isInteger);
    const yt = [0, 0.25, 0.5, 0.75, 1];
    const grid = root.append('g').attr('class', 'pc-grid');
    grid.selectAll('line.gx').data(xt).join('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', h);
    grid.selectAll('line.gy').data(yt).join('line').attr('x1', 0).attr('x2', w).attr('y1', y).attr('y2', y);

    const plot = root.append('g').attr('clip-path', `url(#${clipId})`);
    const lo = Math.max(1, Math.floor(a - pad));
    const hi = Math.min(n, Math.ceil(b + pad));

    // disagreement shading
    const dis = v.showViterbi ? disagreements(v.posterior, v.path) : [];
    plot
      .append('g')
      .attr('class', 'pc-dis')
      .selectAll('rect')
      .data(dis.filter((t) => t >= lo && t <= hi))
      .join('rect')
      .attr('x', (t) => x(t - 0.5))
      .attr('width', (t) => Math.max(1, x(t + 0.5) - x(t - 0.5)))
      .attr('y', 0)
      .attr('height', h);

    // trellis window band
    bandSel = plot.append('rect').attr('class', 'pc-band').attr('y', 0).attr('height', h);

    // reference line
    plot.append('line').attr('class', 'pc-ref').attr('x1', 0).attr('x2', w).attr('y1', y(0.5)).attr('y2', y(0.5));

    // Viterbi step line
    const idx = d3.range(lo - 1, hi);
    if (v.showViterbi) {
      plot
        .append('path')
        .attr('class', 'pc-vit')
        .attr('d', d3.line().curve(d3.curveStepAfter).x((i) => x(i + 1)).y((i) => y(v.path[i]))(idx));
    }

    // posterior line
    plot
      .append('path')
      .attr('class', 'pc-post')
      .attr('d', d3.line().x((i) => x(i + 1)).y((i) => y(v.posterior[i]))(idx));

    if (showMarkers) {
      plot
        .append('g')
        .attr('class', 'pc-markers')
        .selectAll('circle')
        .data(idx)
        .join('circle')
        .attr('class', (i) => (v.tosses[i] === 0 ? 'head' : 'tail'))
        .attr('cx', (i) => x(i + 1))
        .attr('cy', (i) => y(v.posterior[i]))
        .attr('r', visible <= 40 ? 5.5 : 3.5);
    }

    root.append('rect').attr('class', 'pc-border').attr('width', w).attr('height', h);

    // rug (only when markers are not drawn)
    let axisY = h;
    if (!showMarkers) {
      const rug = root.append('g').attr('class', 'pc-rug').attr('clip-path', `url(#${clipId}-rug)`);
      svg.select('defs').append('clipPath').attr('id', `${clipId}-rug`).append('rect').attr('y', h).attr('width', w).attr('height', 20);
      let dH = '';
      let dT = '';
      for (let i = lo - 1; i < hi; i++) {
        const px = x(i + 1).toFixed(1);
        if (v.tosses[i] === 0) dH += `M${px},${h + 2}v5`;
        else dT += `M${px},${h + 8}v5`;
      }
      rug.append('path').attr('class', 'rug-h').attr('d', dH);
      rug.append('path').attr('class', 'rug-t').attr('d', dT);
      root.append('text').attr('class', 'rug-label').attr('x', -6).attr('y', h + 7).attr('text-anchor', 'end').text('H');
      root.append('text').attr('class', 'rug-label').attr('x', -6).attr('y', h + 14).attr('text-anchor', 'end').text('T');
      axisY = h + 15;
    }

    root
      .append('g')
      .attr('class', 'pc-axis')
      .attr('transform', `translate(0,${axisY})`)
      .call(d3.axisBottom(x).tickValues(xt).tickFormat(d3.format('d')).tickSizeOuter(0));
    root.append('g').attr('class', 'pc-axis').call(d3.axisLeft(y).tickValues(yt).tickFormat(d3.format('.2f')).tickSizeOuter(0));
    root
      .append('text')
      .attr('class', 'pc-axis-title')
      .attr('x', w / 2)
      .attr('y', axisY + 38)
      .attr('text-anchor', 'middle')
      .text('toss t');

    // brush-to-zoom; a plain click moves the trellis window
    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [w, h],
      ])
      .on('end', (ev) => {
        if (!ev.sourceEvent) return;
        if (ev.selection) {
          const [s0, s1] = ev.selection.map(x.invert);
          const z0 = Math.max(1, Math.round(s0));
          const z1 = Math.min(n, Math.round(s1));
          brushG.call(brush.move, null);
          if (z1 - z0 >= 1) onZoom([z0, z1]);
        } else {
          const [px] = d3.pointer(ev.sourceEvent, root.node());
          const t = Math.max(1, Math.min(n, Math.round(x.invert(px))));
          onPickToss(t - 1);
        }
      });
    const brushG = root.append('g').attr('class', 'pc-brush').call(brush);

    el.querySelector('#pc-vit-pending').hidden = v.showViterbi;
    el.querySelector('#pc-showall').disabled = !v.zoom;
    el.querySelector('#pc-note').textContent = v.showViterbi ? (dis.length ? T.disagreementNote(dis.length) : T.disagreementNone) : '';
    let agree = '';
    if (v.truePath && v.showViterbi) {
      let k = 0;
      for (let t = 0; t < n; t++) if (v.truePath[t] === v.path[t]) k++;
      agree = T.agreement(`${((100 * k) / n).toFixed(1)}%`);
    }
    el.querySelector('#pc-agree').textContent = agree;
    updateBand(lastWindow);
  }

  return { render, updateBand };
}
