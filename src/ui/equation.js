// HTML builders for recursion equations in the lecture's style, with "from F" / "from B" under-braces.
import { sub } from '../hmm/format.js';

const BRACE_PATH = 'M1 1 Q1 5 6 5 L44 5 Q50 5 50 9 Q50 5 56 5 L94 5 Q99 5 99 1';

export function brace(termHtml, label, cls = '') {
  return `<span class="ub ${cls}"><span class="ub-term">${termHtml}</span><svg class="ub-brace" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="${BRACE_PATH}" vector-effect="non-scaling-stroke"/></svg><span class="ub-label">${label}</span></span>`;
}

const stateSpan = (s) => `<span class="st st-${s}">${s}</span>`;

/** "δ₃(F)" */
export function sym(letter, t, s) {
  return `<span class="eq-sym">${letter}<sub>${t}</sub>(${stateSpan(s)})</span>`;
}

/**
 * Max (Viterbi) or Sum (Forward) recursion line.
 * terms: [fromF, fromB] as preformatted strings; winner: 'F'|'B' (max mode only).
 * opts.log: show ln-space form (sums instead of products).
 */
export function recursionLine({ mode, letter, t, s, terms, emit, result, winner, log = false }) {
  const lhs = log ? `ln ${sym(letter, t, s)}` : sym(letter, t, s);
  const tF = brace(terms[0], 'from F', mode === 'max' && winner === 'F' ? 'win' : mode === 'max' ? 'lose' : '');
  const tB = brace(terms[1], 'from B', mode === 'max' && winner === 'B' ? 'win' : mode === 'max' ? 'lose' : '');
  const op = log ? ' + ' : ' · ';
  const inner = mode === 'max' ? `max(${tF}, ${tB})` : log ? `lse(${tF}, ${tB})` : `(${tF} + ${tB})`;
  const phi = mode === 'max' ? `<span class="eq-phi">φ<sub>${t}</sub>(${stateSpan(s)}) = ${stateSpan(winner)}</span>` : '';
  return `<div class="eq-line">${lhs} = ${inner}${op}${emit} = <strong>${result}</strong>${phi ? ',' : ''}${phi}</div>`;
}

/** First column: δ₁(F) = 0.5 · 0.5 = 0.25 */
export function firstLine({ letter, s, start, emit, result, log = false }) {
  const op = log ? ' + ' : ' · ';
  const lhs = log ? `ln ${sym(letter, 1, s)}` : sym(letter, 1, s);
  return `<div class="eq-line">${lhs} = ${start}${op}${emit} = <strong>${result}</strong></div>`;
}

/** Backward pass: β₂(F) = (0.95 · 0.5 · 1 + 0.05 · 0.1 · 1) = 0.48, with "to F" / "to B" under-braces. */
export function backwardLine({ t, s, terms, result }) {
  return `<div class="eq-line">${sym('β', t, s)} = ${brace(terms[0], 'to F')} + ${brace(terms[1], 'to B')} = <strong>${result}</strong></div>`;
}

export function plainLine(html) {
  return `<div class="eq-line">${html}</div>`;
}

export { stateSpan, sub };
