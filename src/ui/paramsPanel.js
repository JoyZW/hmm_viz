// Shared, collapsible parameter panel (five controls, complements read-only).
import { params as T } from '../content/text.js';
import { fmtProb } from '../hmm/format.js';

const GROUPS = [
  ['start', ['pf']],
  ['trans', ['fb', 'bf']],
  ['emit', ['hf', 'hb']],
];

export function mountParamsPanel(el, layoutEl, store, actions) {
  el.innerHTML = `
    <div class="sidebar-head">
      <h2>${T.heading}</h2>
      <button type="button" class="btn small icon" id="sidebar-toggle" aria-expanded="true" title="${T.collapse}" aria-label="${T.collapse}">«</button>
    </div>
    <div class="sidebar-body" id="sidebar-body">
      <p class="help">${T.help}</p>
      ${GROUPS.map(
        ([g, keys]) => `
        <fieldset class="param-group">
          <legend>${T.groups[g]}</legend>
          ${keys
            .map(
              (k) => `
            <div class="param-row" data-key="${k}" title="${T.controls[k].tooltip}">
              <label for="num-${k}" class="param-label">${T.controls[k].label}</label>
              <input type="range" min="0" max="1" step="0.01" id="rng-${k}" aria-label="${T.controls[k].label}" />
              <input type="number" min="0" max="1" step="0.01" id="num-${k}" class="num" />
              <div class="complement" id="cmp-${k}"></div>
            </div>`,
            )
            .join('')}
        </fieldset>`,
      ).join('')}
      <button type="button" class="btn" id="params-reset">${T.reset}</button>
    </div>`;

  const toggle = el.querySelector('#sidebar-toggle');
  toggle.addEventListener('click', () => {
    const collapsed = layoutEl.classList.toggle('sidebar-collapsed');
    toggle.textContent = collapsed ? '»' : '«';
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.title = collapsed ? T.expand : T.collapse;
    toggle.setAttribute('aria-label', toggle.title);
    window.dispatchEvent(new Event('resize'));
  });

  el.querySelector('#params-reset').addEventListener('click', () => actions.resetControls());

  const keys = GROUPS.flatMap(([, k]) => k);
  for (const k of keys) {
    const rng = el.querySelector(`#rng-${k}`);
    const num = el.querySelector(`#num-${k}`);
    rng.addEventListener('input', () => actions.setControls({ [k]: Number(rng.value) }));
    num.addEventListener('input', () => {
      const v = num.value.trim() === '' ? NaN : Number(num.value);
      const ok = Number.isFinite(v) && v >= 0 && v <= 1;
      num.classList.toggle('invalid', !ok);
      if (ok && v !== store.get().controls[k]) actions.setControls({ [k]: v });
    });
    num.addEventListener('change', () => {
      num.classList.remove('invalid');
      num.value = String(store.get().controls[k]);
    });
  }

  const render = (s) => {
    for (const k of keys) {
      const v = s.controls[k];
      const rng = el.querySelector(`#rng-${k}`);
      const num = el.querySelector(`#num-${k}`);
      rng.value = String(v);
      if (!(document.activeElement === num && Number(num.value) === v)) {
        num.value = String(v);
        num.classList.remove('invalid');
      }
      const minDec = k === 'fb' || k === 'bf' ? 2 : 1;
      el.querySelector(`#cmp-${k}`).textContent = `${T.controls[k].complement} = ${fmtProb(1 - v, minDec)}`;
    }
  };
  store.subscribe((s, prev) => {
    if (s.controls !== prev.controls) render(s);
  });
  render(store.get());
}
