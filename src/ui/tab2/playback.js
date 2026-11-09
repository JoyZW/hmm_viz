// Tab 2 — playback controls. All columns are precomputed; playback only moves the cursor k.
//   k ∈ [0, n]   : forward pass, k columns revealed
//   k ∈ (n, 2n]  : backtrack, k − n columns traced back from the right
import { tab2 as T } from '../../content/text.js';

const SPEED_MIN = 1;
const SPEED_MAX = 500;
const SLIDER_MAX = 1000;
const toSpeed = (v) => SPEED_MIN * Math.pow(SPEED_MAX / SPEED_MIN, v / SLIDER_MAX);
const toSlider = (speed) => (SLIDER_MAX * Math.log(speed / SPEED_MIN)) / Math.log(SPEED_MAX / SPEED_MIN);

export function mountPlayback(el, store, { setK, setNav }) {
  el.innerHTML = `
    <div class="playback" role="group" aria-label="Playback">
      <button type="button" class="btn icon" id="pb-reset" title="${T.playback.reset}" aria-label="${T.playback.reset}">⏮</button>
      <button type="button" class="btn icon" id="pb-back" title="${T.playback.back}" aria-label="${T.playback.back}">◀</button>
      <button type="button" class="btn icon primary" id="pb-play" title="${T.playback.play}" aria-label="${T.playback.play}">▶</button>
      <button type="button" class="btn icon" id="pb-step" title="${T.playback.step}" aria-label="${T.playback.step}">▶|</button>
      <button type="button" class="btn icon" id="pb-skip" title="${T.playback.skip}" aria-label="${T.playback.skip}">⏭</button>
      <label class="speed"><span>${T.playback.speed}</span>
        <input type="range" id="pb-speed" min="0" max="${SLIDER_MAX}" step="1" />
        <output id="pb-speed-out"></output>
      </label>
      <span class="phase" id="pb-phase" aria-live="polite"></span>
    </div>`;
  const $ = (s) => el.querySelector(s);
  const n = () => store.get().t2seq.tosses.length;
  const k = () => store.get().t2nav.k;

  let raf = null;
  let lastTs = 0;
  let acc = 0;

  const loop = (ts) => {
    const s = store.get();
    if (!s.t2nav.playing) {
      raf = null;
      return;
    }
    const dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    acc += dt * s.t2nav.speed;
    const steps = Math.floor(acc);
    if (steps > 0) {
      acc -= steps;
      const N = n();
      const cur = s.t2nav.k;
      const limit = cur < N ? N : 2 * N; // pause at the end of the forward pass
      const target = Math.min(limit, cur + steps);
      setK(target, { playing: target < limit });
      if (target >= limit) {
        raf = null;
        return;
      }
    }
    raf = requestAnimationFrame(loop);
  };

  const play = () => {
    const N = n();
    if (k() >= 2 * N) setK(0, { playing: true });
    else setNav({ playing: true });
    lastTs = 0;
    acc = 1; // move immediately
    if (!raf) raf = requestAnimationFrame(loop);
  };
  const pause = () => setNav({ playing: false });
  const toggle = () => (store.get().t2nav.playing ? pause() : play());
  const step = () => setK(Math.min(2 * n(), k() + 1), { playing: false });
  const back = () => setK(Math.max(0, k() - 1), { playing: false });
  const reset = () => setK(0, { playing: false });
  const skip = () => setK(k() < n() ? n() : 2 * n(), { playing: false });

  $('#pb-reset').addEventListener('click', reset);
  $('#pb-back').addEventListener('click', back);
  $('#pb-play').addEventListener('click', toggle);
  $('#pb-step').addEventListener('click', step);
  $('#pb-skip').addEventListener('click', skip);
  $('#pb-speed').addEventListener('input', (e) => {
    const sp = Math.round(toSpeed(Number(e.target.value)));
    setNav({ speed: Math.max(SPEED_MIN, Math.min(SPEED_MAX, sp)) });
  });

  const render = (s) => {
    const N = s.t2seq.tosses.length;
    const { k: kk, playing, speed } = s.t2nav;
    const playBtn = $('#pb-play');
    playBtn.textContent = playing ? '⏸' : '▶';
    playBtn.title = playing ? T.playback.pause : T.playback.play;
    playBtn.setAttribute('aria-label', playBtn.title);
    $('#pb-back').disabled = kk === 0;
    $('#pb-reset').disabled = kk === 0;
    $('#pb-step').disabled = kk >= 2 * N;
    $('#pb-skip').disabled = kk >= 2 * N;
    const sl = $('#pb-speed');
    if (document.activeElement !== sl) sl.value = String(Math.round(toSlider(speed)));
    $('#pb-speed-out').textContent = `${speed} col/s`;
    let phase;
    if (kk < N) phase = kk === 0 ? T.eqIdle : T.phaseForward(kk, N);
    else if (kk === N) phase = T.phaseForwardDone(N);
    else if (kk < 2 * N) phase = T.phaseBacktrack(2 * N - kk + 1);
    else phase = T.phaseDone;
    $('#pb-phase').textContent = phase;
    if (!playing && raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };

  return { render, keys: { next: step, back, space: toggle } };
}
