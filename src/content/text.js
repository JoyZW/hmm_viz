// ALL explanatory / teaching prose lives here, so wording can be edited without touching code.
// Template functions receive pre-formatted strings (numbers already formatted by the caller)
// unless noted otherwise.

// ───────────────────────── App shell ─────────────────────────

export const app = {
  title: 'Crooked Casino HMM Explorer',
  tagline: 'A dealer tosses a coin. The coin is Fair or Biased, and the dealer occasionally swaps it. We see only the tosses.',
  tabs: ['How HMMs work', 'Long sequences'],
  narrowBanner: 'This explorer is designed for desktop screens',
  dismiss: 'Dismiss',
  impossible: 'This toss sequence is impossible under these parameters.',
};

// ───────────────────────── Parameter panel ─────────────────────────

export const params = {
  heading: 'Model parameters',
  help: 'Each row has one free value; its complement is shown in grey. Any change recomputes both tabs and restarts the step-through.',
  reset: 'Reset to lecture defaults',
  collapse: 'Hide parameters',
  expand: 'Show parameters',
  groups: {
    start: 'Starting probabilities',
    trans: 'Transition probabilities',
    emit: 'Emission probabilities',
  },
  controls: {
    pf: { label: 'P(start F)', complement: 'P(start B)', tooltip: 'Probability that the first toss uses the Fair coin.' },
    fb: { label: 'P(F→B)', complement: 'F→F', tooltip: 'Probability the dealer swaps from the Fair coin to the Biased coin between two tosses.' },
    bf: { label: 'P(B→F)', complement: 'B→B', tooltip: 'Probability the dealer swaps from the Biased coin back to the Fair coin between two tosses.' },
    hf: { label: 'P(H | F)', complement: 'P(T | F)', tooltip: 'Probability of Heads when the Fair coin is in use.' },
    hb: { label: 'P(H | B)', complement: 'P(T | B)', tooltip: 'Probability of Heads when the Biased coin is in use.' },
  },
};

// ───────────────────────── Toss-sequence errors ─────────────────────────

export function parseError(err) {
  if (err.code === 'char') return `“${err.char}” at position ${err.position} is not a toss. Use only H and T (spaces and commas are ignored).`;
  if (err.code === 'empty') return 'Enter at least one toss (H or T).';
  if (err.code === 'tooLong') return `That is ${err.length} tosses; the limit here is ${err.max}.`;
  return 'Invalid toss sequence.';
}

// ───────────────────────── Tab 1 ─────────────────────────

export const tab1 = {
  inputLabel: 'Toss sequence (1–4 tosses)',
  intro:
    'With only a few tosses we can list every coin path, work out its joint probability, and answer the three questions by brute force. Then the trellis shows how to get the same answers without the list.',
  stageTitles: ['Stage 1 — Enumeration table', 'Stage 2 — The three questions', 'Stage 3 — Trellis by hand'],
  stepperHint: 'Use Back / Next (or ← / → / Space) to step through.',
  fillAll: 'Fill all',
  sumLabel: 'Sum',
  coinPathHeader: 'Coin path',

  stage1Start: (nRows, tosses) =>
    `Each row of the table is one coin path for ${tosses}: ${nRows} rows in all. A row's joint probability Pr(q, ${tosses}) is the product of one "transition · emission" factor per toss (toss 1 uses "start · emission"). Press Next to fill the first row.`,
  stage1Row: ({ index, nRows, path, tosses, factors, joint }) =>
    `Row ${index} of ${nRows}, coin path ${path}: Pr(q, ${tosses}) = ${factors} = ${joint}.`,
  stage1AllRows: (nRows) => `All ${nRows} rows are filled. Press Next to add them up.`,
  stage1Sum: ({ nRows, tosses, likelihood }) =>
    `Adding all ${nRows} joint probabilities gives the likelihood Pr(${tosses}) = ${likelihood}. Press Next for the three questions this table can answer.`,

  questions: ['How likely are the tosses?', 'Which coin at toss t?', 'Which sequence of coins is most likely?'],
  tossPickerLabel: 'Toss t:',
  stage2Intro: 'Pick a question. Each one is answered by summing, filtering or maximising the table above. Press Next to move on to the trellis.',
  qLikelihood: ({ nRows, tosses, likelihood }) =>
    `The likelihood is the probability of the tosses summed over every coin path: Pr(${tosses}) = sum of all ${nRows} rows = ${likelihood}.`,
  qPosterior: ({ t, count, numerator, likelihood, posterior }) =>
    `Keep only the ${count} rows with B at toss ${t} (highlighted). Posterior Pr(B at toss ${t} | tosses) = sum of highlighted / Sum = ${numerator} / ${likelihood} = ${posterior}.`,
  qViterbi: ({ path, joint, nRows }) =>
    `The Viterbi path is the row with the largest joint probability: ${path}, with Pr(q, tosses) = ${joint}. This needed all ${nRows} rows. The trellis finds the same row without listing them.`,

  modeMax: 'Max (Viterbi)',
  modeSum: 'Sum (Forward)',
  modeLabel: 'Recursion:',
  trellisTitle: ({ mode, t, tosses }) => (mode === 'max' ? `Viterbi by hand, toss ${t} of ${tosses}` : `Forward by hand, toss ${t} of ${tosses}`),

  maxStart:
    'δₜ(s) is the joint probability of the best coin path that ends in coin state s at toss t. Each Next computes one node: compare the two incoming arrows, keep the larger, multiply by the emission b. Press Next for δ₁(F).',
  maxFirst: ({ s, value }) => `δ₁(${s}) = Pr(start ${s}) · b = ${value}. At the first toss there is nothing to compare.`,
  maxNode: ({ t, s, fromF, fromB, winner, emit, value }) =>
    `δ${t}(${s}): arrive from F (${fromF}) or from B (${fromB}). Keep the larger (from ${winner}), multiply by b = ${emit} to get ${value}, and remember the choice: φ${t}(${s}) = ${winner}. The losing arrow will fade — no best path uses it.`,
  maxForwardDone: 'All δ values are filled. Press Next to backtrack from the last column.',
  backtrackFirst: ({ n, fVal, bVal, s }) =>
    `Backtrack: the Viterbi path ends in the coin state with the larger final value — δ${n}(F) = ${fVal} vs δ${n}(B) = ${bVal} — so toss ${n} is ${s}.`,
  backtrackStep: ({ t, tSub, s, prev }) => `Follow the backpointer: φ${tSub}(${s}) = ${prev}, so toss ${t - 1} is ${prev}.`,
  backtrackDone: ({ path, joint }) =>
    `Viterbi path: ${path}, with joint probability ${joint} — exactly the largest row of the enumeration table (now highlighted), found without listing every row.`,

  sumStart:
    'Same trellis, but αₜ(s) = Pr(tosses 1..t, coin state s at toss t) adds the two incoming arrows instead of keeping the larger. Nothing is discarded, so no arrow fades. Press Next for α₁(F).',
  sumFirst: ({ s, value }) => `α₁(${s}) = Pr(start ${s}) · b = ${value}.`,
  sumNode: ({ t, s, fromF, fromB, emit, value }) =>
    `α${t}(${s}): add the routes from F (${fromF}) and from B (${fromB}), then multiply by b = ${emit}: ${value}. Both arrows count.`,
  sumForwardDone: 'All α values are filled. Press Next to add the last column.',
  sumTotal: ({ n, total }) =>
    `Pr(tosses) = α${n}(F) + α${n}(B) = ${total} — the Sum row of the enumeration table. A backward pass βₜ(s) runs the same kind of sum from right to left; αₜ(B)·βₜ(B) / Pr(tosses) is the posterior from Stage 2.`,
};

// ───────────────────────── Tab 2 ─────────────────────────

export const tab2 = {
  intro:
    'For long toss sequences we cannot list 2ⁿ coin paths. The Viterbi trellis computes one column per toss; the posterior comes from forward–backward. Numbers this small need care — see the precision comparison at the bottom.',
  textareaLabel: 'Toss sequence (type or paste, 1–5000 tosses)',
  useTyped: 'Use this sequence',
  lengthLabel: 'Length n',
  seedLabel: 'Seed',
  newSeed: 'New seed',
  simulate: 'Simulate',
  lectureExample: 'Lecture 20-toss example',
  status: ({ n, source, seed }) =>
    source === 'sim' ? `n = ${n} tosses · simulated (seed ${seed})` : `n = ${n} tosses · typed / pasted (no true coin available)`,
  badLength: 'Length must be a whole number from 1 to 5000.',
  badSeed: 'Seed must be a whole number.',

  trellisHeading: 'Viterbi trellis',
  posteriorHeading: 'Posterior vs Viterbi path',
  precisionHeading: 'Precision comparison',

  overviewRows: { forward: 'Best so far (argmax δₜ)', viterbi: 'Viterbi path', truth: 'True coin' },
  showTrue: 'Show true coin',
  showLn: 'Show ln δ',
  overviewHelp: 'Click or drag on the strip to move the detail window.',
  playback: {
    reset: 'Reset (⏮)',
    back: 'Step back (◀)',
    play: 'Play (▶)',
    pause: 'Pause (⏸)',
    step: 'Step (▶|)',
    skip: 'Skip to end of forward pass (⏭); press again to finish the backtrack',
    speed: 'Speed',
  },
  phaseForward: (c, n) => `Forward pass: column ${c} of ${n}`,
  phaseForwardDone: (n) => `Forward pass complete (${n} columns). Press ▶ or ▶| to backtrack.`,
  phaseBacktrack: (t) => `Backtrack: at toss ${t}`,
  phaseDone: 'Backtrack complete — the Viterbi path is drawn.',
  eqIdle: 'Press ▶ or ▶| to compute the first column.',
  eqBacktrackStart: ({ n, fVal, bVal, s }) => `Backtrack starts at toss ${n}: δ${n}(F) = ${fVal}, δ${n}(B) = ${bVal}, so toss ${n} is ${s}.`,
  eqBacktrackStep: ({ t, tSub, s, prev }) => `φ${tSub}(${s}) = ${prev}, so toss ${t - 1} is ${prev}.`,
  viterbiJoint: (v) => `Joint probability of the Viterbi path: Pr(Viterbi path, tosses) = ${v}`,
  agreement: (pct) => `Viterbi agreement with true coin: ${pct}`,

  legendPosterior: 'Posterior Pr(biased | tosses)',
  legendViterbi: 'Viterbi path (0 = fair, 1 = biased)',
  legendViterbiPending: '(appears after the backtrack)',
  legendToss: 'Toss',
  legendDisagree: 'Viterbi ≠ most likely coin at that toss',
  legendWindow: 'trellis window',
  showAll: 'Show all',
  chartHelp: 'Drag across the chart to zoom; click to move the trellis window to that toss.',
  disagreementNote: (count) =>
    `Shaded tosses (${count}) are where the Viterbi path disagrees with the posterior's most likely coin at that toss. No contradiction: the Viterbi path is the single best whole coin path, while the posterior answers about each toss separately, summing over every path.`,
  disagreementNone: 'Here the Viterbi path agrees with the posterior’s most likely coin at every toss.',

  precisionExplain:
    'Every method computes the same quantities, but a product of n probabilities shrinks roughly like 0.5ⁿ and drops below the smallest double (about 10⁻³⁰⁸) after roughly a thousand tosses. Then naive forward–backward stores exact zeros, so the likelihood is 0 and every posterior is 0/0 = NaN; naive Viterbi compares 0 against 0, the tie-break (prefer F) picks F, and the path is silently wrong — not NaN. Rescaled and log-space keep every value representable and agree.',
  tryN: 'Try n = 2000',
  precisionRows: {
    logLik: 'Log-likelihood',
    underflow: 'First underflow at toss',
    nan: 'NaN posteriors',
    differs: 'Viterbi path differs from log-space at',
    smallest: 'Smallest nonzero value stored',
  },
  precisionTooltips: {
    logLik: 'ln Pr(tosses) from the forward pass. Naive shows −∞ once its likelihood underflows to 0.',
    underflow: 'First toss where a naive α or δ cell is exactly 0 while the log-space value is finite.',
    nan: 'Tosses whose posterior could not be computed (0/0).',
    differs: 'Number of tosses where this method’s Viterbi path differs from the log-space Viterbi path.',
    smallest: 'Smallest positive raw number held in this method’s α, β and δ tables. Log-space stores logarithms instead.',
  },
  methodNames: { naive: 'Naive', rescaled: 'Rescaled', log: 'Log-space' },
  none: 'none',
  na: 'N/A',
  tosses: (k) => `${k} toss${k === 1 ? '' : 'es'}`,
  reference: '0 (reference)',
  logStored: (minLn) => `stores ln values (smallest ln = ${minLn})`,
};
