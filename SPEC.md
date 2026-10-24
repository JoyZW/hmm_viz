# SPEC — Crooked Casino HMM Explorer

You are building a static, browser-based teaching tool for hidden Markov models, deployed to GitHub Pages. This document is the complete brief. Where it is silent, choose the simplest thing consistent with it and note the choice in the README.

**Read [CONTEXT.md](CONTEXT.md) first.** It is the project glossary. Use its terms exactly in UI text, identifiers and comments (e.g. "toss", "coin state", "coin path", "posterior", "Viterbi path", "enumeration table", "trellis"), and avoid the words it lists under _Avoid_.

Reference images from the course lecture are in [docs/img/](docs/img/):
- `hidden_path.png` — the Viterbi trellis by hand for T T H. Tab 1's trellis should look like this.
- `output-table.png` — the enumeration table for T T H. Tab 1's table should look like this.
- `posterior-chart.png` — posterior line + Viterbi step line for the 20-toss example. Tab 2's posterior chart should look like this at short lengths.

---

## 1. Audience and goal

Students learning HMMs for the first time. The app must make each computation *visible*: where every number comes from, which candidate wins, and why. Correctness and clarity beat visual flourish.

The model: a dealer tosses a coin; the coin is either Fair (F) or Biased (B) and the dealer occasionally swaps it. We see only the tosses.

Two tabs:
- **Tab 1 — "How HMMs work"**: tiny sequences (1–4 tosses). Brute-force enumeration table → the three questions → Viterbi / Forward trellis by hand.
- **Tab 2 — "Long sequences"**: 1–5000 tosses. Animated Viterbi trellis with a sliding window, posterior chart, precision comparison.

---

## 2. Tech stack and constraints

- **Vanilla JavaScript (ES modules) + D3 v7**, built with **Vite**, tested with **Vitest**. No React or other UI framework. (Rationale: the state is tiny — parameters, two sequences, a playback cursor — and almost all work is SVG drawing that D3 should own outright; a virtual-DOM framework would compete with D3 for the same nodes.)
- Static output only; no server, no external APIs, no analytics.
- **Desktop only.** Design for ≥ 1024 px wide. Below 1024 px, show a dismissible banner "This explorer is designed for desktop screens" and otherwise do nothing special.
- Deploy via a GitHub Actions workflow on push to `main`: `npm ci` → `npm test` → `npm run build` → deploy `dist/` with `actions/deploy-pages`. Tests failing must block deployment. Set Vite `base` to `/hmm_viz/` (the repo name).
- Pin dependency versions via `package-lock.json`.

### Suggested layout

```
index.html
src/
  main.js                 # boot, tab switching, wiring
  styles.css
  hmm/                    # PURE: no DOM, no D3. Everything here is unit-tested.
    model.js              # parameter object, defaults, validation, complements
    enumerate.js          # brute force over all coin paths
    viterbi.js            # naive / rescaled / log
    forwardBackward.js    # naive / rescaled / log
    simulate.js           # seeded RNG + sampler
    parse.js              # toss-sequence parsing/validation
    format.js             # number formatting (sig figs, sci-notation-from-log)
  state/
    store.js              # tiny pub/sub store
    url.js                # read/write state to location.hash
  ui/
    paramsPanel.js
    tab1/ enumerationTable.js, questions.js, trellisByHand.js
    tab2/ sequenceInput.js, trellisWindow.js, overviewStrip.js, playback.js,
          posteriorChart.js, precisionPanel.js
  content/
    text.js               # ALL explanatory/teaching prose lives here
test/
  *.test.js
.github/workflows/deploy.yml
```

Keep `src/hmm/` strictly pure so it can be tested without a browser.

---

## 3. The model

### Representation

States are indices `0 = F`, `1 = B`. Symbols are `0 = H`, `1 = T`.

```js
params = {
  start: [pF, pB],                 // starting probabilities
  trans: [[pFF, pFB], [pBF, pBB]], // transition probabilities, row = from
  emit:  [[pH_F, pT_F], [pH_B, pT_B]] // emission probabilities, row = coin state
}
```

### Lecture defaults

| | |
|---|---|
| Starting | P(F) = 0.5, P(B) = 0.5 |
| Transitions | F→F 0.95, F→B 0.05; B→F 0.20, B→B 0.80 |
| Emissions | Fair H 0.5 / T 0.5; Biased H 0.1 / T 0.9 |

### Editing

With two states and two symbols, each row has exactly one free value. The parameter panel exposes **five** controls — P(start F), P(F→B), P(B→F), P(H | F), P(H | B) — each a slider paired with a numeric input (step 0.01 on the slider; the numeric input accepts any value in [0, 1]). Complements are derived and displayed read-only next to each control (e.g. "F→F = 0.95"). A "Reset to lecture defaults" button restores the table above.

- One **shared** parameter panel for both tabs, in a collapsible left sidebar.
- Values of exactly 0 and 1 are allowed. Every algorithm must handle zero probabilities correctly (log 0 = −∞, never NaN in the stable methods).
- Any parameter change recomputes everything immediately and resets Tab 1 / Tab 2 step-through to the start.

---

## 4. Toss-sequence input (`parse.js`)

- Case-insensitive `H`/`T`. Ignore whitespace and commas. Any other character → inline error naming the first offending character and its position; previous valid sequence stays active.
- Tab 1: length 1–4. Default `TTH`.
- Tab 2: length 1–5000. Default: simulated, n = 500, seed = 615.
- Empty or over-length input → inline error, no recompute.

### Simulation (`simulate.js`)

- Seeded PRNG (e.g. mulberry32); same seed + params + n → identical output on every browser.
- Samples the coin path from start/trans, then each toss from emit. Returns `{ tosses, truePath }`.
- UI: length field, seed field (pre-filled, editable), "New seed" button, "Simulate" button.
- When the sequence was simulated, keep `truePath`; show it as an optional "True coin" strip (Tab 2) and report "Viterbi agreement with true coin: xx.x%". When the sequence was typed/pasted, there is no truth: hide the strip and the metric.

---

## 5. Algorithms (`src/hmm/`)

All functions are pure and return full tables (not only final answers) because the UI animates them.

### 5.1 Brute-force enumeration (`enumerate.js`)

For sequences of length n ≤ 12 (UI uses ≤ 4; tests use ≤ 8). Lists all 2ⁿ coin paths in lexicographic order with F before B (FFF, FFB, FBF, …, BBB — matching `output-table.png`). For each path return per-toss factors `[{trans or start, emit}]` and the joint probability. Also return likelihood (sum), and helpers for posterior-by-filtering and argmax.

### 5.2 Viterbi (`viterbi.js`)

δ₁(s) = start(s)·emit(s, x₁); δₜ(s) = maxᵣ[δₜ₋₁(r)·trans(r, s)]·emit(s, xₜ); φₜ(s) = argmax.

Return per column: both candidates for each state (`fromF`, `fromB`), the winner, δ, φ; plus the backtracked path and its joint probability (as a log value).

Three precision methods:
- **naive** — plain products in doubles.
- **rescaled** — after each column, divide both δ by the column max; accumulate log of scale factors so the true log δ is recoverable.
- **log** — sums of logs; max over logs.

**Tie-break rule (all methods, everywhere):** on equal candidates prefer **F** (the "from F" candidate, and F as the final state). This makes results deterministic and is what produces an all-F path when naive Viterbi underflows to 0 vs 0.

### 5.3 Forward–backward (`forwardBackward.js`)

α, β, likelihood, and posterior P(B at t | tosses) = αₜ(B)βₜ(B) / likelihood.

- **naive** — plain products. Expected failure: likelihood underflows to 0 and posteriors become 0/0 = NaN.
- **rescaled** — standard cₜ normalisation of α (cₜ = column sum); β scaled by the same cₜ; log-likelihood = Σ log cₜ.
- **log** — log-sum-exp that handles −∞ inputs (log-sum-exp of all −∞ is −∞, not NaN).

If the likelihood is 0 under a stable method (the sequence is impossible under the current parameters, e.g. P(H | F) = P(H | B) = 0 and an H occurs), return a flag; the UI replaces results with "This toss sequence is impossible under these parameters."

**The main views always use log-space Viterbi and rescaled forward–backward.** Naive is *only* computed and shown inside the precision comparison panel (§7.4). Do not add a toggle that puts naive results into the main views.

### 5.4 Number formatting (`format.js`)

- Tab 1: 3 significant figures, plain decimals (0.119, 0.0564, 0.0259), matching the lecture.
- Tab 2: values derived from logs, shown as scientific notation `3.1 × 10⁻⁸⁰⁰` (mantissa/exponent computed from the log — never by exponentiating). A small switch next to the trellis toggles display to `ln δ = −1842.3`.

---

## 6. Tab 1 — "How HMMs work"

Top of tab: toss-sequence input (1–4 tosses, default TTH) and a short intro paragraph. Below it three stages, revealed in order with **Back / Next / Reset** controls, plus a **"Fill all"** shortcut inside stage 1. A caption area under each stage explains the current step (text from `content/text.js`).

### Stage 1 — Enumeration table

Matches `output-table.png`: columns *Coin path | toss 1: x₁ | … | toss n: xₙ | Pr(q, tosses)*, one row per coin path, then a **Sum** row.

- Each Next fills **one row**: its factor cells (`0.5 · 0.5`, `0.95 · 0.5`, …; toss 1 uses start · emit, later tosses use trans · emit), then its joint probability.
- After the last row, Next fills the Sum row (= likelihood).
- At n = 4 there are 16 rows; the table must fit without horizontal scroll at 1024 px.

### Stage 2 — The three questions

Three buttons, each highlighting the table and showing a short derivation in the caption:
1. **How likely are the tosses?** Highlight the Sum row → likelihood (0.1389 for TTH).
2. **Which coin at toss t?** A toss picker; highlight rows with B at toss t; show "sum of highlighted / Sum = posterior" (t = 2 for TTH → 0.434).
3. **Which sequence of coins is most likely?** Highlight the max row → Viterbi path (FFF, 0.0564). Caption: "This needed all 2ⁿ rows. The trellis finds the same row without listing them."

### Stage 3 — Trellis by hand

Matches `hidden_path.png`: a *start* node, two rows (Fair, Biased) by n columns, column headers "t = k: Tail/Head", each node showing the coin state, its emission (`b = 0.5`) and its value; arrows labelled with transition probabilities.

- A **Max (Viterbi) / Sum (Forward)** switch above the trellis.
- **Max mode:** each Next computes **one node** (δₜ(F) then δₜ(B)). The current column is highlighted (as in the image). Below the trellis show the equation in the image's style:
  `δ₃(F) = max(0.119 · 0.95, 0.324 · 0.20) · 0.5 = 0.0564,  φ₃(F) = F`, with "from F"/"from B" under-braces. The winning incoming arrow becomes bold; the losing one fades.
- After the last node, further Next steps run the **backtrack** one column at a time right to left (pick the larger final δ, follow φ), drawing the Viterbi path in the path colour. The final step's caption confirms it equals the max row in Stage 1.
- **Sum mode:** same trellis and stepping but αₜ(s) = (Σ …)·emit; both incoming arrows stay full-strength (nothing is discarded); equation shows the sum. Final step: α_n(F) + α_n(B) equals the Sum row of the table. No backtrack in Sum mode. Mention the backward pass in caption text only; do not visualise it.
- Switching mode resets Stage 3 to its first step.

Use the lecture notation (δₜ, φₜ, αₜ, Pr(q, …)) in equations; render with plain HTML/SVG text and Unicode subscripts — no LaTeX library is required unless trivial to add.

---

## 7. Tab 2 — "Long sequences"

Top: sequence input — textarea (type or paste), length + seed + Simulate controls, and a status line (n, source: typed/simulated).

Vertical order of the panels below: Viterbi trellis → posterior chart → precision comparison.

### 7.1 Viterbi trellis with sliding window

- **Overview strip** (full width, full sequence): one thin column per toss. During the forward pass, revealed columns are coloured by argmax δₜ; unrevealed columns are grey. After backtrack, a second row shows the Viterbi path. If a true path exists, a third, toggleable row "True coin" shows it. A rectangle marks the current window; click or drag to move it. Render runs of identical states as single rects (or use canvas) so 5000 tosses stay fast.
- **Detail window**: ~25 columns centred on the current column (clamped at ends). Above each column, the toss (H/T) and its index. Each cell shows δ (formatted per §5.4) and emission. Each cell has both incoming arrows: winner solid, loser faded. Columns beyond the cursor are empty.
- **Equation panel** under the window, for the current column: the two max equations in the same style as Tab 1 (values from logs, sci notation).
- One **step = one column** (both cells).

### 7.2 Playback

Controls: ⏮ reset · ◀ step back · ▶/⏸ play/pause · ▶| step · ⏭ skip to end of forward pass; speed slider 1–500 columns/s on a log scale (default 10). Use `requestAnimationFrame`, advancing multiple columns per frame at high speeds. The detail window follows the cursor.

All columns are computed up front; playback only reveals them, so stepping back is trivial.

After the forward pass completes, a **Backtrack** phase starts (same controls, cursor moving right → left, window following). Each step marks the chosen state and its φ arrow. At the end, the Viterbi path is drawn as a coloured line through the detail window and filled into the overview strip. Show the Viterbi path's joint probability (sci notation).

### 7.3 Posterior chart

Matches `posterior-chart.png` at short lengths: x = toss t, y ∈ [0, 1]; posterior P(B | tosses) as a navy line; Viterbi path as an ochre step line (0 = F, 1 = B); dotted reference line at 0.5; legend as in the image.

- **Always fully computed and shown**; not stepped through. (The Viterbi step line appears only once the backtrack has finished, or immediately if the user skipped to the end.)
- **Scaling to long sequences:** when ≤ 100 tosses are in the visible x-range, draw a marker per toss (filled = Tail, hollow = Head). Above that, draw only the line, and show H/T as a thin rug of tick marks under the x-axis.
- **Linked to the trellis**: the x-range defaults to the full sequence; a shaded band shows the trellis window's range; clicking the chart moves the trellis window to that toss. Provide brush-to-zoom on the x-axis and a "Show all" reset.
- **Disagreement shading**: shade the background at tosses where the Viterbi path's state differs from the per-toss most likely coin (posterior > 0.5 ⇒ B, < 0.5 ⇒ F; exactly 0.5 is not a disagreement). Include a short note (from `text.js`) explaining why: the Viterbi path is the single best *whole* path; the posterior answers about *each toss separately*. In the 20-toss lecture example this shades tosses 8 (posterior 0.459) and 14 (0.497).
- If a true path exists, report Viterbi agreement with the true coin above the chart.

### 7.4 Precision comparison panel

Runs all three methods on the current Tab 2 sequence and shows a table with one column per method (Naive, Rescaled, Log-space) and rows:

| Row | Meaning |
|---|---|
| Log-likelihood | from forward; naive shows −∞ once it underflows |
| First underflow at toss | first t where a naive α (or δ) cell is exactly 0 while the log-space value is finite; "none" otherwise. N/A for the stable methods |
| NaN posteriors | count of tosses with NaN posterior |
| Viterbi path differs from log-space at | count of tosses |
| Smallest nonzero value stored | min positive raw number held in the method's tables |

Above the table, one sentence explaining what's happening, and a button **"Try n = 2000"** that simulates 2000 tosses with the current seed (at n = 500 with default parameters, naive usually survives; underflow typically appears somewhere around 700–1100 tosses). The explanation must name both failure modes: naive posteriors become NaN (0/0), and naive Viterbi compares 0 against 0, so the tie-break (prefer F) produces a wrong path — not NaN.

---

## 8. State, URL and text

- A tiny store holds: active tab, params, Tab 1 sequence, Tab 2 sequence source (`{seed, n}` or explicit tosses), playback cursor/phase, display toggles.
- **Shareable URL** in `location.hash`, e.g. `#tab=2&pf=0.5&fb=0.05&bf=0.2&hf=0.5&hb=0.1&t1=TTH&seed=615&n=500` or `…&seq=THTHTT…`. Encode an explicit Tab 2 sequence only if ≤ 200 tosses; longer typed sequences are not put in the URL (the URL then omits Tab 2's sequence). Playback position is not encoded. Invalid hash values fall back to defaults silently.
- **All teaching prose** (stage captions, per-step captions, question explanations, disagreement note, precision explanation, tooltips) lives in `src/content/text.js` as plain strings/template functions, so the author can edit wording without touching code. You draft the text; keep it short, plain, and in the lecture's notation.

---

## 9. Visual design

- Consistent colour for coin state across the app: one colour for **F**, one for **B** (colour-blind-safe pair, e.g. blue vs vermillion). Posterior line navy, Viterbi path ochre (as in `posterior-chart.png`). Faded/losing arrows at ~25% opacity. Define colours as CSS custom properties.
- Readable at 1024–1920 px. System font stack; tabular numerals for all numbers.
- Every interactive control is keyboard-reachable; Tab 1 and Tab 2 step controls respond to ←/→ and Space when the tab is focused.

---

## 10. Tests (Vitest, `src/hmm/` only — no UI tests)

Tolerance: compare lecture values at the precision printed (e.g. `|x − 0.0564| < 5e-5`); compare methods against each other with relative tolerance 1e-9.

### Lecture fixtures (default parameters)

**T T H**
- Viterbi path F F F, joint probability 0.0564.
- Viterbi table: toss 1 F 0.25, B 0.45; toss 2 F 0.119 (0.11875), B 0.324; toss 3 F 0.0564, B 0.0259. φ₃(F) = F, φ₃(B) = B.
- Forward: toss 2 F 0.164 (0.16375), B 0.335 (0.33525).
- Likelihood 0.1389 (0.13895).
- Posterior P(B at toss 2) = 0.434.
- Enumeration table joint probabilities, in order FFF…BBB: 0.0564, 0.0006, 0.0011, 0.0009, 0.0214, 0.0002, 0.0324, 0.0259.

**T H T H T T H T T T T T T H T T T T T T** (20 tosses)
- Viterbi path F F F F F F F B B B B B B B B B B B B B (switch at toss 8; the lone H at toss 14 is absorbed).
- Viterbi joint probability ≈ 2.7865e-7.
- Posteriors P(B), tosses 1–20 (3 d.p.): 0.405, 0.188, 0.193, 0.142, 0.239, 0.272, 0.250, 0.459, 0.581, 0.647, 0.670, 0.656, 0.603, 0.497, 0.627, 0.702, 0.736, 0.740, 0.714, 0.652.
- Disagreement tosses: exactly {8, 14}.

### Brute-force agreement

For every toss sequence of length 1–8, under the lecture defaults plus ≥ 5 random parameter sets (fixed seed) including sets with entries of exactly 0 or 1: rescaled and log forward–backward match enumeration for likelihood and every posterior; log and rescaled Viterbi joint probability equals the enumeration max; the Viterbi path equals the enumeration argmax whenever that max is unique (and obeys the prefer-F tie-break otherwise).

### Precision

- n = 300 simulated (fixed seed): all three methods agree on log-likelihood, posteriors and Viterbi path.
- n = 3000 simulated: naive likelihood is 0 (log −∞) and posteriors are NaN; rescaled and log agree with each other; naive "first underflow" is reported and is < 3000.

### Edge cases

- n = 1.
- Impossible sequence (e.g. P(H|F) = P(H|B) = 0 with an H) → impossible flag, no NaN in stable methods.
- Deterministic parameters (transition 1.0) produce correct −∞ handling.
- Parser: mixed case, whitespace, commas accepted; other characters rejected with position; length bounds enforced per tab.
- Simulator: same seed ⇒ identical output; empirical emission frequencies on a long run within tolerance of the parameters.
- Formatter: sci-notation-from-log for very negative logs (e.g. ln = −1842.3 → "× 10⁻⁸⁰¹"-range correct mantissa/exponent).

---

## 11. Out of scope

More than two coin states or more than two symbols; parameter learning (Baum–Welch); mobile/touch layouts; visualising the backward pass as a trellis; any backend, accounts or persistence beyond the URL; UI/e2e tests.

---

## 12. Acceptance checklist

- [ ] `npm test` passes all fixtures above; GitHub Action blocks deploy on failure.
- [ ] Site loads from GitHub Pages at `/hmm_viz/` with no console errors.
- [ ] Tab 1 with TTH: stepping through reproduces `output-table.png` row by row, the three questions give 0.1389 / 0.434 / FFF, and the trellis reproduces `hidden_path.png`'s numbers and arrow fading; Sum mode reproduces 0.164 / 0.335 and ends at 0.1389.
- [ ] Tab 2 with the 20-toss example reproduces `posterior-chart.png`, with tosses 8 and 14 shaded.
- [ ] Tab 2 at n = 5000: simulate, play at max speed, skip, backtrack, and chart interaction all stay responsive (no frame longer than ~50 ms during playback).
- [ ] Precision panel at n = 2000 shows naive failing (NaN posteriors, −∞ log-likelihood, wrong Viterbi tosses) while rescaled and log agree.
- [ ] Changing any parameter recomputes both tabs; a copied URL reopens the same tab, parameters and sequence.
- [ ] All teaching text is in `src/content/text.js`.
