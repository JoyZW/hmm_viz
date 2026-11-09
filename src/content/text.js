// ALL explanatory / teaching prose lives here, so wording can be edited without touching code.
// Template functions receive pre-formatted strings (numbers already formatted by the caller)
// unless noted otherwise.

// ───────────────────────── App shell ─────────────────────────

export const app = {
  title: 'Crooked Casino HMM Explorer',
  tabs: ['How HMMs work', 'Speeding it up', 'Posterior vs Viterbi path', 'Long sequences'],
  narrowBanner: 'This explorer is designed for desktop screens',
  dismiss: 'Dismiss',
  impossible: 'This toss sequence is impossible under these parameters.',
};

// ───────────────────────── Parameter panel ─────────────────────────

export const params = {
  heading: 'Model parameters',
  help: 'Complements in grey. Changes restart the step-through; Reset also restores T T H.',
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
  inputLabel: 'Toss sequence',
  inputHint: '1–4 tosses, H or T',
  stageTitles: ['Enumeration table', 'The three questions'],
  stepperHint: 'Keyboard: ← / → / Space step through.',
  fillAll: 'Fill all',
  sumLabel: 'Sum',
  coinPathHeader: 'Coin path',

  stage1Start: (nRows, tosses) =>
    `Each row of the table is one coin path for ${tosses} (${nRows} in all). Its joint probability Pr(q, ${tosses}) multiplies one "transition · emission" factor per toss (toss 1: "start · emission") — one arrow and one node per toss on the trellis. Press Next to fill the first row.`,
  stage1RowShort: ({ index, nRows }) =>
    `Row ${index} of ${nRows} is filled, and its coin path is traced on the trellis. Click any filled row to trace it again.`,
  stage1Picked: (path) => `Coin path ${path} is traced on the trellis. Next or Back carries on stepping.`,
  stage1AllRows: (nRows) => `All ${nRows} rows are filled. Press Next to add them up.`,
  stage1Sum: ({ nRows, tosses, likelihood }) =>
    `Adding all ${nRows} joint probabilities gives the likelihood Pr(${tosses}) = ${likelihood}. Press Next for the three questions this table can answer.`,

  traceRowLabel: (path) => `Coin path ${path}: trace it on the trellis`,
  trellisAria: 'Trellis with one coin path traced',
  // ── Stage 1 trellis (one coin path traced) ──
  trellisLegend:
    '<span class="lg-edge">arrows:</span> transition probabilities &nbsp;·&nbsp; <span class="lg-node">nodes:</span> emission probability of the observed toss',
  trellisIdle:
    'Each row of the table is one coin path through this trellis: start at the left, follow one arrow per toss, and multiply each arrow (transition) by the node it lands on (emission).',
  trellisAll: ({ nRows, tosses, likelihood }) => `Pr(${tosses}) = sum over all ${nRows} coin paths through the trellis = <strong>${likelihood}</strong>`,
  // path and factors are HTML
  trellisRow: ({ path, tosses, factors, joint, viterbi }) =>
    `${viterbi ? 'Viterbi path: ' : ''}Pr(${path}, ${tosses}) = ${factors} = <strong>${joint}</strong>`,
  trellisNode: ({ t, count, numerator }) =>
    `Every coin path through <span class="st st-B">Biased</span> at toss ${t} is one of the ${count} highlighted rows; together they sum to <strong>${numerator}</strong>.`,

  // ── Stage 2: the three questions ──
  questions: ['How likely are the tosses?', 'Which coin at toss t?', 'Which sequence of coins is most likely?'],
  // Lecture notation, as HTML.
  qSymbols: [
    'Pr(<b>o</b> | λ)',
    'Pr(q<sub>t</sub> = S<sub>i</sub> | <b>o</b>, λ)',
    'arg max<sub><b>q</b></sub> Pr(<b>q</b> | <b>o</b>, λ)',
  ],
  qHeading: 'The three questions',
  qHead: { answer: (nRows) => `answered from the ${nRows} rows` },
  qFootnote: 'Dividing every row by the same sum does not change which row is largest.',
  qInactive: 'Fill the table to answer these.',
  tossPickerLabel: 'Toss t:',
  // Answer-column cells (HTML; numbers pre-formatted, path already coloured).
  aLikelihood: ({ nRows, likelihood }) => `add all ${nRows} rows: <strong>${likelihood}</strong>`,
  aPosterior: ({ t, numerator, likelihood, posterior, complement }) =>
    `rows with B at toss ${t}, divided by the Sum: ${numerator} / ${likelihood} = <strong>${posterior}</strong> = Pr(B at toss ${t})<br><span class="muted">so Pr(F at toss ${t}) = 1 − ${posterior} = ${complement}</span>`,
  aViterbi: ({ path, joint }) => `the largest row: <strong>${path}</strong> (${joint})`,
  stage2Intro:
    'Press Next to answer the questions one at a time, or click a question. Each answer comes from summing, filtering or maximising the enumeration table above.',
  stage2Done: 'That is everything brute force can do. Press Next for “Speeding it up”: the same three answers from the trellis, without listing the rows.',
  toSpeed: 'Speeding it up →',
  qLikelihood: ({ nRows, tosses, likelihood }) =>
    `The likelihood is the probability of the tosses summed over every coin path: Pr(${tosses}) = sum of all ${nRows} rows = ${likelihood}.`,
  qPosterior: ({ t, count, numerator, likelihood, posterior, complement }) =>
    `Keep only the ${count} rows with B at toss ${t} (highlighted). Posterior Pr(B at toss ${t} | tosses) = sum of highlighted / Sum = ${numerator} / ${likelihood} = ${posterior}. Fair is the only other coin, so Pr(F at toss ${t} | tosses) = ${complement}.`,
  qViterbi: ({ path, joint, nRows }) =>
    `The Viterbi path is the row with the largest joint probability: ${path}, with Pr(q, tosses) = ${joint}. This needed all ${nRows} rows. The trellis finds the same row without listing them.`,
};

// ───────────────────────── Speeding it up ─────────────────────────

export const speed = {
  // Each toggle names its question and the trellis method that answers it.
  qToggle: ['Q1 How likely?', 'Q2 Which coin?', 'Q3 Which sequence?'],
  qMethod: ['Forward', 'Forward–backward', 'Viterbi'],
  qToggleLabel: 'Question:',
  trellisAria: 'Trellis running the forward, backward or Viterbi pass',
  // Bottom-right legend under the trellis, per question (HTML).
  legend: {
    lik: '<span class="lg-edge">arrows:</span> transitions, both counted &nbsp;·&nbsp; <span class="lg-node">b:</span> emission of the observed toss &nbsp;·&nbsp; <span class="lg-a">α</span>: forward value',
    post: '<span class="lg-a">α</span>: forward (navy) &nbsp;·&nbsp; <span class="lg-b">β</span>: backward (teal arrows while in use) &nbsp;·&nbsp; <span class="lg-p">bar</span>: Pr(B at that toss)',
    vit: '<span class="lg-edge">bold:</span> winning arrow (φ) &nbsp;·&nbsp; faded: beaten &nbsp;·&nbsp; <span class="lg-v">ochre:</span> Viterbi path &nbsp;·&nbsp; <span class="lg-alt">dashed:</span> what if',
  },
  tableHead: 'Trellis values',
  how: {
    lik: 'Forward pass: add the arrows into each node, then add up the last column.',
    post: 'Forward pass, then backward pass; at each toss, α · β divided by Pr(tosses).',
    vit: 'Viterbi pass: keep the larger arrow into each node, then backtrack.',
  },
  notYet: 'Step through to the end of the pass to get the answer.',
  postRow: 'Pr(B at toss)',
  pathRow: 'Viterbi path',
  // Answer-card text (HTML, numbers pre-formatted).
  aLik: ({ n, f, b, total }) => `α<sub>${n}</sub>(F) + α<sub>${n}</sub>(B) = ${f} + ${b} = <strong>${total}</strong>`,
  checkLik: (brute) => `✓ the Sum row in “How HMMs work” (${brute})`,
  aPost: ({ t, a, b, L, p, pF }) =>
    `α<sub>${t}</sub>(B) · β<sub>${t}</sub>(B) / Pr(tosses) = ${a} · ${b} / ${L} = <strong>${p}</strong> = Pr(B at toss ${t})<br><span class="muted">so Pr(F at toss ${t}) = ${pF}</span>`,
  checkPost: ({ t, num, L }) => `✓ the rows with B at toss ${t} in “How HMMs work” (${num} / ${L})`,
  aVit: ({ path, joint }) => `Viterbi path <strong>${path}</strong>, joint probability ${joint}`,
  checkVit: (joint) => `✓ the largest row in “How HMMs work” (${joint})`,
  checkFail: 'does not match brute force',
  longNote: 'On long sequences these products shrink below what a computer can store; “Long sequences” shows how logs and rescaling fix that.',

  // ── forward pass (Q1, and the start of Q2) ──
  sumStart:
    'αₜ(s) = Pr(tosses 1..t, coin state s at toss t). Each Next computes one node: add the two incoming arrows, then multiply by the emission b. Nothing is discarded, so no arrow fades. Press Next for α₁(F).',
  sumFirst: ({ s, value }) => `α₁(${s}) = Pr(start ${s}) · b = ${value}.`,
  sumNode: ({ t, s, fromF, fromB, emit, value }) =>
    `α${t}(${s}): add the arrows from F (${fromF}) and from B (${fromB}), then multiply by b = ${emit}: ${value}. Both arrows count — every coin path into this node is included.`,
  sumForwardDone: 'All α values are filled. Press Next to add the last column.',
  sumTotal: ({ n, total }) =>
    `Pr(tosses) = α${n}(F) + α${n}(B) = ${total}: every coin path ends in F or in B at the last toss, so the last column holds all of them — the same number as adding all the rows of the enumeration table, but with four arrows of work per toss instead of one row per coin path.`,

  // ── Q2: backward pass and posterior ──
  postReady: ({ n, L }) =>
    `α is already filled in from Q1 (Back steps through it), and Pr(tosses) = α${n}(F) + α${n}(B) = ${L}. To ask about one toss we also need the tosses after it: that is the backward pass. Press Next.`,
  postForwardDone: 'All α values are filled. Press Next to start the backward pass.',
  bInit: ({ n }) =>
    `The backward pass starts at the last toss: βₜ(s) = Pr(tosses after t | coin state s at toss t). After toss ${n} there are no tosses left to explain, so β${n}(F) = β${n}(B) = 1.`,
  bwdNode: ({ t, tSub, s, next, nextToss, toF, toB, value }) =>
    `β${tSub}(${s}): from ${s} at toss ${t}, add the two arrows out of it — each arrow's transition, times the emission of toss ${next} (${nextToss}) at the node it lands on, times that node's β: ${toF} (to F) + ${toB} (to B) = ${value}.`,
  bwdDone: 'All β values are filled. Press Next to combine α and β at each toss.',
  postStep: ({ t, pB, pF }) =>
    `At toss ${t}, αₜ covers the tosses up to t and βₜ the tosses after it, so αₜ(B)·βₜ(B) is the total of every coin path through Biased at toss ${t}. Dividing by Pr(tosses) gives Pr(B at toss ${t}) = ${pB}; for Fair, ${pF}. The two add to 1.`,
  postDone: 'Every toss has its posterior. Pick a toss in the answer card to read it off.',

  // ── Q3: Viterbi pass and backtrack ──
  maxStart:
    'δₜ(s) is the joint probability of the best coin path that ends in coin state s at toss t. Each Next computes one node: compare the two incoming arrows, keep the larger, multiply by the emission b. Press Next for δ₁(F).',
  maxFirst: ({ s, value }) => `δ₁(${s}) = Pr(start ${s}) · b = ${value}. At the first toss there is nothing to compare.`,
  maxNode: ({ t, s, fromF, fromB, winner, emit, value }) =>
    `δ${t}(${s}): arrive from F (${fromF}) or from B (${fromB}). Keep the larger (from ${winner}), multiply by b = ${emit} to get ${value}, and remember the choice: φ${t}(${s}) = ${winner}. The losing arrow fades — no best path uses it.`,
  maxForwardDone: 'All δ values are filled. Press Next to backtrack from the last column.',
  backtrackFirst: ({ n, fVal, bVal, s }) =>
    `Backtrack, step 1: every coin path ends in F or in B, and δ already holds the best of each — δ${n}(F) = ${fVal}, δ${n}(B) = ${bVal}. The larger wins, so the Viterbi path ends with ${s} (ochre ring). Nothing else is compared from here on: we only read backpointers.`,
  backtrackStep: ({ t, tSub, s, prev }) =>
    `We stand on ${s} at toss ${t} (ochre ring). Its backpointer φ${tSub}(${s}) = ${prev} (outlined in the table) says the best path here came from ${prev} at toss ${t - 1}, so toss ${t - 1} is ${prev}.`,
  backtrackDone: ({ path, joint }) => `Viterbi path ${path} (${joint}): the largest row of the enumeration table, without listing the rows.`,
  backtrackAlt: ({ s, alt, value }) => `Dashed: starting from ${s} instead gives ${alt}, only ${value} — so the end coin is picked first.`,
};

// ───────────────────────── Tab 2 ─────────────────────────

export const tab2 = {
  intro:
    'For long toss sequences we cannot list 2ⁿ coin paths, but the trellis passes from “Speeding it up” still work: forward–backward gives the posterior at every toss and the Viterbi pass gives the best whole coin path. Numbers this small need care — see the precision comparison at the bottom.',
  compareIntro:
    'Two answers to “which coin at each toss?”, on as many tosses as you like: the posterior (Q2) judges each toss on its own; the Viterbi path (Q3) is the single best whole sequence. This toss sequence is shared with “Long sequences”.',
  longIntro:
    'On long sequences the probabilities behind every answer get astronomically small. This tab shows when a computer can no longer store them and how rescaling and logs avoid it. This toss sequence is shared with “Posterior vs Viterbi path”.',
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

  posteriorHeading: 'Which coin at each toss? Posterior vs Viterbi path',
  precisionHeading: 'Precision comparison',

  // How to read the chart (HTML). Parameter values are pre-formatted; the Heads sentence follows the
  // current emission probabilities.
  readGuide: ({ hf, hb, fb, bf, headsLower, headsEqual }) => `<ul class="read-list">
    <li><b class="k-post">Navy line — the posterior.</b> For each toss on its own: the probability the Biased coin was in use, given all the tosses (Q2 in “Speeding it up”, from forward–backward). Near 0.5 means the tosses cannot tell.</li>
    <li><b class="k-vit">Ochre steps — the Viterbi path.</b> The single most likely sequence of coins for the whole run (Q3, from the Viterbi pass): every toss is exactly Fair (0) or Biased (1), never “maybe”.</li>
    <li><b>Dots — the tosses</b> (hollow = Head, filled = Tail). ${
      headsEqual
        ? `Here P(H | F) = P(H | B) = ${hf}, so a single toss says nothing about the coin; the line only reflects the starting and transition probabilities.`
        : headsLower
          ? `Heads pull the navy line down and runs of Tails push it up, because the Biased coin shows Heads less often (P(H | B) = ${hb} vs P(H | F) = ${hf}).`
          : `Heads push the navy line up and runs of Tails pull it down, because the Biased coin shows Heads more often (P(H | B) = ${hb} vs P(H | F) = ${hf}).`
    }</li>
    <li><b class="k-dis">Shading — the two answers disagree.</b> Switching coins costs a transition (P(F→B) = ${fb}, P(B→F) = ${bf}), so the best whole path will not switch away for one surprising toss, even when that toss on its own leans the other way. The Viterbi path is not the navy line rounded at 0.5.</li>
  </ul>`,

  agreement: (pct) => `Viterbi agreement with true coin: ${pct}`,

  legendPosterior: 'Posterior Pr(biased | tosses)',
  legendViterbi: 'Viterbi path (0 = fair, 1 = biased)',
  legendToss: 'Toss',
  legendDisagree: 'Viterbi ≠ most likely coin at that toss',
  showAll: 'Show all',
  chartHelp: 'Drag across the chart to zoom in; “Show all” zooms back out.',
  disagreementNote: (count) =>
    `${count} shaded toss${count === 1 ? '' : 'es'}: the Viterbi path disagrees with the posterior's most likely coin there. No contradiction — the Viterbi path is the single best whole coin path, while the posterior answers about each toss separately, adding up every path.`,
  disagreementItem: ({ t, toss, post, alone, vit }) =>
    `toss ${t} (${toss}): posterior ${post}, so on its own ${alone} is more likely; the Viterbi path says ${vit}.`,
  disagreementMore: (k) => `… and ${k} more.`,
  disagreementNone: 'Here the Viterbi path agrees with the posterior’s most likely coin at every toss.',

  precisionExplain:
    'Every method computes the same quantities, but a product of n probabilities shrinks roughly like 0.5ⁿ and drops below the smallest double (about 10⁻³⁰⁸) after roughly a thousand tosses. Then naive forward–backward stores exact zeros, so the likelihood is 0 and every posterior is 0/0 = NaN; naive Viterbi compares 0 against 0, the tie-break (prefer F) picks F, and the path is silently wrong — not NaN. Rescaled and log-space keep every value representable and agree.',
  tryN: 'Try n = 2000',
  tableLinkHint: 'Hover a row of the table to see it on the chart.',

  // ── precision chart ──
  pcAria: 'How small the forward value gets, toss by toss, against the smallest number a computer can store',
  pcTrue: 'smallest value stored at toss t (an α or δ), true size from log-space',
  pcNaive: 'what naive stores',
  pcRescaled: 'what rescaled stores instead (between 0 and 1)',
  pcSubnormal: 'below 10⁻³⁰⁸: digits being lost, then exactly 0',
  pcYTitle: 'value (log scale)',
  pcFloor: 'smallest double ≈ 10⁻³⁰⁸',
  pcZeroLane: 'stored as 0',
  pcRescLabel: 'rescaled stays near 1',
  pcProjLabel: (t) => `at this rate, naive stores 0 from ≈ toss ${t}`,
  pcFirstUnderflow: (t) => `naive hits 0 at toss ${t}`,
  stripNaive: 'Naive posterior',
  stripNaivePath: 'Naive Viterbi path',
  stripStable: 'Rescaled vs log-space',
  stripOk: 'all fine',
  stripBadCount: (k) => `${k} toss${k === 1 ? '' : 'es'} wrong`,
  // hover readout (HTML): one toss, the same αₜ(F) stored three ways
  readout: ({ t, toss, what, trueVal, naive, naiveZero, resc, cum, lnA }) =>
    `<b>Toss ${t} (${toss}):</b> the smallest value is ${what} = ${trueVal}. &nbsp; <span class="ro-naive">Naive stores <b>${naive}</b>${naiveZero ? ' — the value is lost' : ''}</span> &nbsp;·&nbsp; <span class="ro-resc">Rescaled stores <b>${resc}</b> and keeps the ${cum} (in ln) it divided out on the side</span> &nbsp;·&nbsp; <span class="ro-log">Log-space stores <b>ln = ${lnA}</b></span>. All three mean the same number; only naive cannot hold it.`,
  pcNoteFailed: ({ first, n }) =>
    `The grey line falls by a roughly constant amount per toss — a product of n probabilities shrinks exponentially. Naive follows it exactly until toss ${first}, where its smallest value (a δ from the Viterbi pass, or an α) drops below the smallest double and is stored as 0. Its likelihood is then 0, and every posterior divides by the likelihood, so all of them are 0/0 = NaN — even at toss 1, long before the underflow. Its Viterbi pass breaks only after the underflow, where it compares 0 with 0 and the tie-break picks F. Rescaled and log-space never store anything that small, and agree at all ${n} tosses.`,
  pcNoteSurvives: ({ n, at, normal, zero }) =>
    `Naive survives these ${n} tosses: its smallest value is only down to ${at}. But the grey line falls by a roughly constant amount per toss, so at this rate it would drop below 10⁻³⁰⁸ around toss ${normal} and be stored as exactly 0 around toss ${zero} (dashed). Press “Try n = 2000” to watch it fail.`,
  pcNoteFlat: 'With these parameters the forward value does not shrink, so naive never underflows here.',
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
