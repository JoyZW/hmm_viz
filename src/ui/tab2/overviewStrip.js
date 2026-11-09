// Tab 2 — overview strip: one thin column per toss, drawn on a canvas as runs of identical states.
import { tab2 as T } from '../../content/text.js';

const ROW_H = 14;
const ROW_GAP = 4;

/** Runs of identical values: [[start, endExclusive, value], …] */
export function runs(arr) {
  const out = [];
  if (!arr || arr.length === 0) return out;
  let start = 0;
  for (let i = 1; i <= arr.length; i++) {
    if (i === arr.length || arr[i] !== arr[start]) {
      out.push([start, i, arr[start]]);
      start = i;
    }
  }
  return out;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function mountOverviewStrip(el, { onMove, onToggleTrue }) {
  el.innerHTML = `
    <div class="overview">
      <div class="ov-labels">
        <div class="ov-label">${T.overviewRows.forward}</div>
        <div class="ov-label">${T.overviewRows.viterbi}</div>
        <div class="ov-label ov-truth">${T.overviewRows.truth}</div>
      </div>
      <div class="ov-canvas-wrap"><canvas class="ov-canvas" tabindex="0" aria-label="${T.overviewHelp}"></canvas></div>
    </div>
    <div class="ov-foot">
      <label class="check ov-truth-toggle"><input type="checkbox" id="ov-show-true" /> ${T.showTrue}</label>
      <span class="hint">${T.overviewHelp}</span>
    </div>`;
  const canvas = el.querySelector('canvas');
  const wrap = el.querySelector('.ov-canvas-wrap');
  const ctx = canvas.getContext('2d');
  let cache = {};
  let last = null;

  el.querySelector('#ov-show-true').addEventListener('change', (e) => onToggleTrue(e.target.checked));

  const tossAt = (clientX) => {
    if (!last) return 0;
    const rect = canvas.getBoundingClientRect();
    const f = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(last.n - 1, Math.floor(f * last.n)));
  };
  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    onMove(tossAt(e.clientX));
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) onMove(tossAt(e.clientX));
  });
  canvas.addEventListener('pointerup', () => (dragging = false));
  canvas.addEventListener('pointercancel', () => (dragging = false));

  /**
   * v: { n, argmax, path, truePath, showTrue, fwdCount, btFrom, winStart, winCount }
   *  fwdCount: number of revealed forward columns; btFrom: tosses ≥ btFrom have their Viterbi state revealed.
   */
  function render(v) {
    last = v;
    const hasTruth = !!v.truePath;
    el.querySelector('.ov-truth').hidden = !(hasTruth && v.showTrue);
    el.querySelector('.ov-truth-toggle').hidden = !hasTruth;
    el.querySelector('#ov-show-true').checked = v.showTrue;
    const rows = hasTruth && v.showTrue ? 3 : 2;
    const cssW = Math.max(100, wrap.clientWidth);
    const cssH = rows * ROW_H + (rows - 1) * ROW_GAP + 4;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }
    if (cache.argmax !== v.argmax || cache.path !== v.path || cache.truePath !== v.truePath) {
      cache = {
        argmax: v.argmax,
        path: v.path,
        truePath: v.truePath,
        fwd: runs(v.argmax),
        vit: runs(v.path),
        truth: v.truePath ? runs(v.truePath) : null,
      };
    }
    const colors = [cssVar('--F'), cssVar('--B')];
    const grey = cssVar('--unrevealed');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    const x = (t) => (t / v.n) * cssW;

    const drawRow = (rowRuns, y, from, to) => {
      ctx.fillStyle = grey;
      ctx.fillRect(0, y, cssW, ROW_H);
      for (const [a, b, s] of rowRuns) {
        const lo = Math.max(a, from);
        const hi = Math.min(b, to);
        if (hi <= lo) continue;
        ctx.fillStyle = colors[s];
        ctx.fillRect(x(lo), y, Math.max(0.6, x(hi) - x(lo)), ROW_H);
      }
    };
    let y = 2;
    drawRow(cache.fwd, y, 0, v.fwdCount);
    y += ROW_H + ROW_GAP;
    drawRow(cache.vit, y, v.btFrom, v.n);
    y += ROW_H + ROW_GAP;
    if (rows === 3) drawRow(cache.truth, y, 0, v.n);

    // window rectangle
    const wx = x(v.winStart);
    const ww = Math.max(3, x(v.winStart + v.winCount) - wx);
    ctx.strokeStyle = cssVar('--ink');
    ctx.lineWidth = 2;
    ctx.strokeRect(wx + 1, 1, ww - 2, cssH - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(wx, 0, ww, cssH);
  }

  return { render };
}
