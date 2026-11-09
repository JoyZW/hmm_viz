// Read / write shareable state in location.hash.
// e.g. #tab=speed&q=2&pf=0.5&fb=0.05&bf=0.2&hf=0.5&hb=0.1&t1=TTH&seed=615&n=500   or   …&seq=THTHTT…
import { CONTROL_KEYS, DEFAULT_CONTROLS, isValidProb } from '../hmm/model.js';
import { parseTosses, tossesToString, TAB1_MAX, TAB2_MAX } from '../hmm/parse.js';

export const URL_SEQ_MAX = 200;

/** Tab ids, in display order. Old links used tab=1 / tab=2 for "How HMMs work" / "Long sequences". */
export const TABS = ['how', 'speed', 'compare', 'long'];
const OLD_TAB = { 1: 'how', 2: 'long' };
/** "Speeding it up" question keys and their URL numbers. */
export const SPEED_QS = ['lik', 'post', 'vit'];

/** Parse a hash string; invalid values silently fall back to defaults. */
export function readHash(hash, defaults) {
  const q = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const tab = q.get('tab');
  const qn = Number(q.get('q'));
  const out = {
    tab: TABS.includes(tab) ? tab : OLD_TAB[tab] ?? 'how',
    speedQ: SPEED_QS[qn - 1] ?? 'lik',
    controls: { ...DEFAULT_CONTROLS },
    t1Text: defaults.t1Text,
    t2: { source: 'sim', seed: defaults.seed, n: defaults.n, tosses: null },
  };
  for (const k of CONTROL_KEYS) {
    const v = q.get(k);
    if (v !== null && v.trim() !== '' && isValidProb(Number(v))) out.controls[k] = Number(v);
  }
  const t1 = q.get('t1');
  if (t1 && parseTosses(t1, { max: TAB1_MAX }).ok) out.t1Text = t1.toUpperCase();

  const seq = q.get('seq');
  const seqParsed = seq ? parseTosses(seq, { max: TAB2_MAX }) : null;
  if (seqParsed?.ok) {
    out.t2 = { source: 'typed', tosses: seqParsed.tosses, seed: defaults.seed, n: seqParsed.tosses.length };
  } else {
    const seed = Number(q.get('seed'));
    const n = Number(q.get('n'));
    if (q.get('seed') !== null && Number.isInteger(seed)) out.t2.seed = seed;
    if (q.get('n') !== null && Number.isInteger(n) && n >= 1 && n <= TAB2_MAX) out.t2.n = n;
  }
  return out;
}

export function buildHash(state) {
  const q = new URLSearchParams();
  q.set('tab', state.tab);
  if (state.tab === 'speed') q.set('q', String(SPEED_QS.indexOf(state.speedNav.q) + 1));
  for (const k of CONTROL_KEYS) q.set(k, String(state.controls[k]));
  q.set('t1', tossesToString(state.t1.tosses));
  const s = state.t2seq;
  if (s.source === 'sim') {
    q.set('seed', String(s.seed));
    q.set('n', String(s.n));
  } else if (s.tosses.length <= URL_SEQ_MAX) {
    q.set('seq', tossesToString(s.tosses));
  }
  return '#' + q.toString();
}
