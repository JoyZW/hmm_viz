// Boot, tab switching and wiring.
import './styles.css';
import { DEFAULT_CONTROLS, paramsFromControls } from './hmm/model.js';
import { enumerate } from './hmm/enumerate.js';
import { viterbi, columnArgmax } from './hmm/viterbi.js';
import { forwardBackward } from './hmm/forwardBackward.js';
import { simulate } from './hmm/simulate.js';
import { parseTosses, TAB1_MAX } from './hmm/parse.js';
import { precisionReport } from './hmm/precision.js';
import { createStore } from './state/store.js';
import { readHash, buildHash } from './state/url.js';
import { app as appText } from './content/text.js';
import { mountParamsPanel } from './ui/paramsPanel.js';
import { mountTab1 } from './ui/tab1/tab1.js';
import { mountTab2 } from './ui/tab2/tab2.js';

const DEFAULTS = { t1Text: 'TTH', seed: 615, n: 500 };

// ───────── derived computations ─────────

function computeR1(params, tosses) {
  return {
    table: enumerate(params, tosses),
    vit: viterbi(params, tosses, 'log'),
    fb: forwardBackward(params, tosses, 'rescaled'),
  };
}

function computeR2(params, tosses) {
  const vit = viterbi(params, tosses, 'log');
  const fb = forwardBackward(params, tosses, 'rescaled');
  return { vit, fb, argmax: columnArgmax(vit), report: precisionReport(params, tosses) };
}

function makeT2Seq(src, params) {
  if (src.source === 'sim') {
    const { tosses, truePath } = simulate(params, src.n, src.seed);
    return { source: 'sim', seed: src.seed, n: src.n, tosses, truePath };
  }
  return { source: 'typed', seed: src.seed, n: src.tosses.length, tosses: src.tosses, truePath: null };
}

export const initialT1Nav = () => ({ stage: 1, s1: 0, question: null, qT: 2, mode: 'max', s3: 0 });
export const initialT2Nav = (prev = {}) => ({
  k: 0,
  playing: false,
  speed: prev.speed ?? 10,
  center: 0,
  showLn: prev.showLn ?? false,
  showTrue: prev.showTrue ?? true,
  zoom: null,
});

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
  setControls(patch) {
    const s = store.get();
    const controls = { ...s.controls, ...patch };
    const p = paramsFromControls(controls);
    const seq = makeT2Seq(s.t2seq, p);
    store.set({
      controls,
      params: p,
      r1: computeR1(p, s.t1.tosses),
      t1nav: { ...initialT1Nav(), mode: s.t1nav.mode, qT: s.t1nav.qT },
      t2seq: seq,
      r2: computeR2(p, seq.tosses),
      t2nav: initialT2Nav(s.t2nav),
    });
  },
  resetControls() {
    actions.setControls({ ...DEFAULT_CONTROLS });
  },
  setT1Tosses(tosses) {
    const s = store.get();
    store.set({
      t1: { tosses },
      r1: computeR1(s.params, tosses),
      t1nav: { ...initialT1Nav(), mode: s.t1nav.mode, qT: Math.min(2, tosses.length) },
    });
  },
  setT1Nav(patch) {
    store.set((s) => ({ t1nav: { ...s.t1nav, ...patch } }));
  },
  /** src: {source:'sim', seed, n} | {source:'typed', tosses} */
  setT2Sequence(src) {
    const s = store.get();
    const seq = makeT2Seq({ seed: s.t2seq.seed, ...src }, s.params);
    store.set({ t2seq: seq, r2: computeR2(s.params, seq.tosses), t2nav: initialT2Nav(s.t2nav) });
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
        <p class="tagline">${appText.tagline}</p>
      </div>
      <nav class="tabs" role="tablist" aria-label="Views">
        <button type="button" role="tab" id="tab-btn-1" aria-controls="tab-1" class="tab-btn">${appText.tabs[0]}</button>
        <button type="button" role="tab" id="tab-btn-2" aria-controls="tab-2" class="tab-btn">${appText.tabs[1]}</button>
      </nav>
    </header>
    <div class="layout" id="layout">
      <aside class="sidebar" id="sidebar" aria-label="Model parameters"></aside>
      <main class="main">
        <section id="tab-1" role="tabpanel" aria-labelledby="tab-btn-1" tabindex="-1" class="tab-panel"></section>
        <section id="tab-2" role="tabpanel" aria-labelledby="tab-btn-2" tabindex="-1" class="tab-panel"></section>
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
  const btns = [document.getElementById('tab-btn-1'), document.getElementById('tab-btn-2')];
  const panels = [document.getElementById('tab-1'), document.getElementById('tab-2')];
  btns.forEach((b, i) => {
    b.addEventListener('click', () => actions.setTab(i + 1));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        const j = 1 - i;
        actions.setTab(j + 1);
        btns[j].focus();
      }
    });
  });
  const render = (s) => {
    btns.forEach((b, i) => {
      const active = s.tab === i + 1;
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
    if (s.tab === prev.tab && s.controls === prev.controls && s.t1 === prev.t1 && s.t2seq === prev.t2seq) return;
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
wireTabs();
mountParamsPanel(document.getElementById('sidebar'), document.getElementById('layout'), store, actions);
const tab1 = mountTab1(document.getElementById('tab-1'), store, actions);
const tab2 = mountTab2(document.getElementById('tab-2'), store, actions);
wireKeyboard({ 1: tab1.keys, 2: tab2.keys });
wireUrl();
