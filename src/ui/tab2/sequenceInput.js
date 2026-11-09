// Tab 2 — toss-sequence input: type/paste, or simulate with length + seed.
import { tab2 as T, parseError } from '../../content/text.js';
import { parseTosses, tossesToString, TAB2_MAX } from '../../hmm/parse.js';
import { randomSeed } from '../../hmm/simulate.js';

const LECTURE_20 = 'THTHTTHTTTTTTHTTTTTT';

/** Mounted on both long-sequence tabs (same shared sequence): `prefix` keeps element ids unique. */
export function mountSequenceInput(el, store, actions, { prefix = 't2', intro = T.intro } = {}) {
  const P = prefix;
  el.innerHTML = `
    <p class="intro">${intro}</p>
    <div class="seq-grid">
      <div class="seq-typed">
        <label for="${P}-text">${T.textareaLabel}</label>
        <textarea id="${P}-text" rows="3" spellcheck="false" autocomplete="off" aria-describedby="${P}-error"></textarea>
        <div class="field-row">
          <button type="button" class="btn" id="${P}-use">${T.useTyped}</button>
          <button type="button" class="btn" id="${P}-lecture">${T.lectureExample}</button>
          <span class="error" id="${P}-error" role="alert"></span>
        </div>
      </div>
      <div class="seq-sim">
        <div class="field-row">
          <label for="${P}-n">${T.lengthLabel}</label>
          <input type="number" id="${P}-n" min="1" max="${TAB2_MAX}" step="1" class="num wide" />
          <label for="${P}-seed">${T.seedLabel}</label>
          <input type="number" id="${P}-seed" step="1" class="num wide" />
        </div>
        <div class="field-row">
          <button type="button" class="btn" id="${P}-newseed">${T.newSeed}</button>
          <button type="button" class="btn primary" id="${P}-sim">${T.simulate}</button>
        </div>
      </div>
    </div>
    <p class="status" id="${P}-status" aria-live="polite"></p>`;

  const $ = (s) => el.querySelector(s);
  const err = $(`#${P}-error`);
  const text = $(`#${P}-text`);

  const useTyped = (raw) => {
    const r = parseTosses(raw, { max: TAB2_MAX });
    if (!r.ok) {
      err.textContent = parseError(r);
      text.classList.add('invalid');
      return;
    }
    err.textContent = '';
    text.classList.remove('invalid');
    actions.setT2Sequence({ source: 'typed', tosses: r.tosses });
  };
  $(`#${P}-use`).addEventListener('click', () => useTyped(text.value));
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      useTyped(text.value);
    }
  });
  $(`#${P}-lecture`).addEventListener('click', () => {
    text.value = LECTURE_20;
    useTyped(LECTURE_20);
  });

  const readSim = () => {
    const n = Number($(`#${P}-n`).value);
    const seed = Number($(`#${P}-seed`).value);
    if (!Number.isInteger(n) || n < 1 || n > TAB2_MAX) {
      err.textContent = T.badLength;
      return null;
    }
    if ($(`#${P}-seed`).value.trim() === '' || !Number.isInteger(seed)) {
      err.textContent = T.badSeed;
      return null;
    }
    err.textContent = '';
    return { n, seed };
  };
  $(`#${P}-sim`).addEventListener('click', () => {
    const v = readSim();
    if (v) actions.setT2Sequence({ source: 'sim', ...v });
  });
  $(`#${P}-newseed`).addEventListener('click', () => {
    $(`#${P}-seed`).value = String(randomSeed());
    const v = readSim();
    if (v) actions.setT2Sequence({ source: 'sim', ...v });
  });

  const render = (s) => {
    const q = s.t2seq;
    if (document.activeElement !== text) {
      text.value = tossesToString(q.tosses);
      text.classList.remove('invalid');
    }
    if (document.activeElement !== $(`#${P}-n`)) $(`#${P}-n`).value = String(q.source === 'sim' ? q.n : q.tosses.length);
    if (document.activeElement !== $(`#${P}-seed`)) $(`#${P}-seed`).value = String(q.seed);
    $(`#${P}-status`).textContent = T.status({ n: q.tosses.length, source: q.source, seed: q.seed });
  };
  store.subscribe((s, prev) => {
    if (s.t2seq !== prev.t2seq) {
      err.textContent = '';
      render(s);
    }
  });
  render(store.get());
}

/** Exposed for the precision panel's "Try n = 2000" button. */
export function simulateN(store, actions, n) {
  actions.setT2Sequence({ source: 'sim', n, seed: store.get().t2seq.seed });
}
