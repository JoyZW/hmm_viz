// Boot, tab switching and wiring.
import './styles.css';
import { DEFAULT_CONTROLS, paramsFromControls } from './hmm/model.js';
import { enumerate } from './hmm/enumerate.js';
import { viterbi } from './hmm/viterbi.js';
import { forwardBackward } from './hmm/forwardBackward.js';
import { simulate } from './hmm/simulate.js';
import { parseTosses, TAB1_MAX } from './hmm/parse.js';
import { precisionReport } from './hmm/precision.js';
import { createStore } from './state/store.js';
import { readHash, buildHash, TABS } from './state/url.js';
import { app as appText } from './content/text.js';
import { mountParamsPanel } from './ui/paramsPanel.js';
import { wireFit } from './ui/fit.js';
import { mountTab1 } from './ui/tab1/tab1.js';
import { mountCompareTab, mountLongTab } from './ui/tab2/tab2.js';
import { mountSpeed } from './ui/speed/speed.js';
import { speedStart } from './ui/speed/speedSteps.js';

const DEFAULTS = { t1Text: 'TTH', seed: 615, n: 500 };

// ───────── derived computations ─────────

function computeR1(params, tosses) {
  return {
    table: enumerate(params, tosses),
    vit: viterbi(params, tosses, 'log'),
    fb: forwardBackward(params, tosses, 'rescaled'),
    // "Speeding it up" shows plain α and β; with 1–4 tosses plain products cannot underflow.
    fbN: forwardBackward(params, tosses, 'naive'),
  };
}

function computeR2(params, tosses) {
  const vit = viterbi(params, tosses, 'log');
  const fb = forwardBackward(params, tosses, 'rescaled');
  return { vit, fb, report: precisionReport(params, tosses) };
}

function makeT2Seq(src, params) {
  if (src.source === 'sim') {
    const { tosses, truePath } = simulate(params, src.n, src.seed);
    return { source: 'sim', seed: src.seed, n: src.n, tosses, truePath };
  }
  return { source: 'typed', seed: src.seed, n: src.tosses.length, tosses: src.tosses, truePath: null };
}

// rev: questions answered so far in Stage 2, in the order they were revealed.
// sel: a table row the user picked to trace on the Stage 1 trellis (cleared by any step).
export const initialT1Nav = (qT = 2) => ({ stage: 1, s1: 0, question: null, rev: [], qT, sel: null });
// "Speeding it up": the selected question and each question's own step (Q2 starts with α filled).
export const initialSpeedNav = (n, q = 'lik', qT = 2) => ({
  q,
  k: { lik: speedStart('lik', n), post: speedStart('post', n), vit: speedStart('vit', n) },
  qT: Math.min(qT, n),
});
// Long sequences: only the chart's zoom (x-range, 1-based) is view state.
export const initialT2Nav = () => ({ zoom: null });

// ───────── initial state from the URL ─────────

const fromHash = readHash(location.hash, DEFAULTS);
const params = paramsFromControls(fromHash.controls);
const t1Tosses = parseTosses(fromHash.t1Text, { max: TAB1_MAX }).tosses;
const t2seq = makeT2Seq(fromHash.t2, params);

export const store = createStore({
  tab: fromHash.tab,
  controls: fromHash.controls,
  params,
  t1: { tosses: t1Tosses },
  t1nav: initialT1Nav(),
  speedNav: initialSpeedNav(t1Tosses.length, fromHash.speedQ),
  r1: computeR1(params, t1Tosses),
  t2seq,
  r2: computeR2(params, t2seq.tosses),
  t2nav: initialT2Nav(),
});

// ───────── actions ─────────

export const actions = {
  setTab(tab) {
    store.set({ tab });
  },
  /** Optional `t1Tosses` replaces the Tab 1 toss sequence in the same update (used by reset). */
  setControls(patch, t1Tosses = null) {
    const s = store.get();
    const controls = { ...s.controls, ...patch };
    const p = paramsFromControls(controls);
    const seq = makeT2Seq(s.t2seq, p);
    const tosses = t1Tosses ?? s.t1.tosses;
    store.set({
      controls,
      params: p,
      ...(t1Tosses ? { t1: { tosses } } : {}),
      r1: computeR1(p, tosses),
      t1nav: initialT1Nav(t1Tosses ? Math.min(2, tosses.length) : s.t1nav.qT),
      speedNav: initialSpeedNav(tosses.length, s.speedNav.q, t1Tosses ? 2 : s.speedNav.qT),
      t2seq: seq,
      r2: computeR2(p, seq.tosses),
      t2nav: initialT2Nav(),
    });
  },
  /** Lecture parameters and the Tab 1 default toss sequence. The Tab 2 sequence is left alone. */
  resetControls() {
    actions.setControls({ ...DEFAULT_CONTROLS }, parseTosses(DEFAULTS.t1Text, { max: TAB1_MAX }).tosses);
  },
  setT1Tosses(tosses) {
    const s = store.get();
    store.set({
      t1: { tosses },
      r1: computeR1(s.params, tosses),
      t1nav: initialT1Nav(Math.min(2, tosses.length)),
      speedNav: initialSpeedNav(tosses.length, s.speedNav.q, 2),
    });
  },
  setT1Nav(patch) {
    store.set((s) => ({ t1nav: { ...s.t1nav, ...patch } }));
  },
  setSpeedNav(patch) {
    store.set((s) => ({ speedNav: { ...s.speedNav, ...patch } }));
  },
  /** Hand-off from "How HMMs work": open "Speeding it up" on Q1 at its first step. */
  goSpeed() {
    store.set((s) => ({ tab: 'speed', speedNav: { ...s.speedNav, q: 'lik', k: { ...s.speedNav.k, lik: 0 } } }));
  },
  /** src: {source:'sim', seed, n} | {source:'typed', tosses} */
  setT2Sequence(src) {
    const s = store.get();
    const seq = makeT2Seq({ seed: s.t2seq.seed, ...src }, s.params);
    store.set({ t2seq: seq, r2: computeR2(s.params, seq.tosses), t2nav: initialT2Nav() });
  },
  setT2Nav(patch) {
    store.set((s) => ({ t2nav: { ...s.t2nav, ...patch } }));
  },
};

// ───────── DOM shell ─────────

function buildShell() {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div id="narrow-banner" class="narrow-banner" role="status" hidden>
      <span>${appText.narrowBanner}</span>
      <button type="button" class="btn small" id="narrow-dismiss">${appText.dismiss}</button>
    </div>
    <header class="app-header">
      <div class="title-block">
        <h1>${appText.title}</h1>
      </div>
      <nav class="tabs" role="tablist" aria-label="Views">
        ${TABS.map((id, i) => `<button type="button" role="tab" id="tab-btn-${id}" aria-controls="tab-${id}" class="tab-btn">${appText.tabs[i]}</button>`).join('')}
      </nav>
    </header>
    <div class="layout" id="layout">
      <aside class="sidebar" id="sidebar" aria-label="Model parameters"></aside>
      <main class="main">
        ${TABS.map((id) => `<section id="tab-${id}" role="tabpanel" aria-labelledby="tab-btn-${id}" tabindex="-1" class="tab-panel"></section>`).join('')}
      </main>
    </div>`;

  // narrow-screen banner
  const banner = document.getElementById('narrow-banner');
  let dismissed = false;
  const checkWidth = () => {
    banner.hidden = dismissed || window.innerWidth >= 1024;
  };
  document.getElementById('narrow-dismiss').addEventListener('click', () => {
    dismissed = true;
    checkWidth();
  });
  window.addEventListener('resize', checkWidth);
  checkWidth();
}

function wireTabs() {
  const btns = TABS.map((id) => document.getElementById(`tab-btn-${id}`));
  const panels = TABS.map((id) => document.getElementById(`tab-${id}`));
  btns.forEach((b, i) => {
    b.addEventListener('click', () => actions.setTab(TABS[i]));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        const j = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
        actions.setTab(TABS[j]);
        btns[j].focus();
      }
    });
  });
  const render = (s) => {
    btns.forEach((b, i) => {
      const active = s.tab === TABS[i];
      b.setAttribute('aria-selected', String(active));
      b.tabIndex = active ? 0 : -1;
      b.classList.toggle('active', active);
      panels[i].hidden = !active;
    });
  };
  store.subscribe((s, prev) => {
    if (s.tab !== prev.tab) render(s);
  });
  render(store.get());
}

function wireUrl() {
  let timer = null;
  store.subscribe((s, prev) => {
    if (s.tab === prev.tab && s.controls === prev.controls && s.t1 === prev.t1 && s.t2seq === prev.t2seq && s.speedNav.q === prev.speedNav.q) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const h = buildHash(store.get());
      if (h !== location.hash) history.replaceState(null, '', h);
    }, 150);
  });
  history.replaceState(null, '', buildHash(store.get()));
  // A hash edited by hand (or a pasted share link in the same tab) reloads the app from it.
  // Our own replaceState calls do not fire hashchange.
  window.addEventListener('hashchange', () => location.reload());
}

/** ←/→/Space drive the active tab's step controls, unless the user is typing in a field. */
function wireKeyboard(handlers) {
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const el = e.target;
    const tag = el?.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (tag === 'INPUT' && !['button', 'checkbox', 'radio'].includes(el.type)) return;
    if (el?.getAttribute?.('role') === 'tab') return;
    if (tag === 'BUTTON' && e.key === ' ') return; // let Space activate the focused button
    const h = handlers[store.get().tab];
    if (!h) return;
    if (e.key === 'ArrowRight') h.next();
    else if (e.key === 'ArrowLeft') h.back();
    else if (e.key === ' ') h.space();
    else return;
    e.preventDefault();
  });
}

buildShell();
wireFit(document.getElementById('app')); // before mounting, so first measurements see the final scale
wireTabs();
mountParamsPanel(document.getElementById('sidebar'), document.getElementById('layout'), store, actions);
const tab1 = mountTab1(document.getElementById('tab-how'), store, actions);
const speed = mountSpeed(document.getElementById('tab-speed'), store, actions);
const compare = mountCompareTab(document.getElementById('tab-compare'), store, actions);
const long = mountLongTab(document.getElementById('tab-long'), store, actions);
wireKeyboard({ how: tab1.keys, speed: speed.keys, compare: compare.keys, long: long.keys });
wireUrl();
