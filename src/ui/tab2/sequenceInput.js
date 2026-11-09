// Tab 2 — toss-sequence input: type/paste, or simulate with length + seed.
import { tab2 as T, parseError } from '../../content/text.js';
import { parseTosses, tossesToString, TAB2_MAX } from '../../hmm/parse.js';
import { randomSeed } from '../../hmm/simulate.js';

const LECTURE_20 = 'THTHTTHTTTTTTHTTTTTT';

export function mountSequenceInput(el, store, actions) {
  el.innerHTML = `
    <p class="intro">${T.intro}</p>
    <div class="seq-grid">
      <div class="seq-typed">
        <label for="t2-text">${T.textareaLabel}</label>
        <textarea id="t2-text" rows="3" spellcheck="false" autocomplete="off" aria-describedby="t2-error"></textarea>
        <div class="field-row">
          <button type="button" class="btn" id="t2-use">${T.useTyped}</button>
          <button type="button" class="btn" id="t2-lecture">${T.lectureExample}</button>
          <span class="error" id="t2-error" role="alert"></span>
        </div>
      </div>
      <div class="seq-sim">
        <div class="field-row">
          <label for="t2-n">${T.lengthLabel}</label>
          <input type="number" id="t2-n" min="1" max="${TAB2_MAX}" step="1" class="num wide" />
          <label for="t2-seed">${T.seedLabel}</label>
          <input type="number" id="t2-seed" step="1" class="num wide" />
        </div>
        <div class="field-row">
          <button type="button" class="btn" id="t2-newseed">${T.newSeed}</button>
          <button type="button" class="btn primary" id="t2-sim">${T.simulate}</button>
        </div>
      </div>
    </div>
    <p class="status" id="t2-status" aria-live="polite"></p>`;

  const $ = (s) => el.querySelector(s);
  const err = $('#t2-error');
  const text = $('#t2-text');

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
  $('#t2-use').addEventListener('click', () => useTyped(text.value));
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      useTyped(text.value);
    }
  });
  $('#t2-lecture').addEventListener('click', () => {
    text.value = LECTURE_20;
    useTyped(LECTURE_20);
  });

  const readSim = () => {
    const n = Number($('#t2-n').value);
    const seed = Number($('#t2-seed').value);
    if (!Number.isInteger(n) || n < 1 || n > TAB2_MAX) {
      err.textContent = T.badLength;
      return null;
    }
    if ($('#t2-seed').value.trim() === '' || !Number.isInteger(seed)) {
      err.textContent = T.badSeed;
      return null;
    }
    err.textContent = '';
    return { n, seed };
  };
  $('#t2-sim').addEventListener('click', () => {
    const v = readSim();
    if (v) actions.setT2Sequence({ source: 'sim', ...v });
  });
  $('#t2-newseed').addEventListener('click', () => {
    $('#t2-seed').value = String(randomSeed());
    const v = readSim();
    if (v) actions.setT2Sequence({ source: 'sim', ...v });
  });

  const render = (s) => {
    const q = s.t2seq;
    if (document.activeElement !== text) {
      text.value = tossesToString(q.tosses);
      text.classList.remove('invalid');
    }
    if (document.activeElement !== $('#t2-n')) $('#t2-n').value = String(q.source === 'sim' ? q.n : q.tosses.length);
    if (document.activeElement !== $('#t2-seed')) $('#t2-seed').value = String(q.seed);
    $('#t2-status').textContent = T.status({ n: q.tosses.length, source: q.source, seed: q.seed });
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
