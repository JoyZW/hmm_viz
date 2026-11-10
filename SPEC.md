# SPEC — Crooked Casino HMM Explorer

You are building a static, browser-based teaching tool for hidden Markov models, deployed to GitHub Pages. This document is the complete brief. Where it is silent, choose the simplest thing consistent with it and note the choice in the README.

This document is self-contained: the glossary (§0) and descriptions of the three lecture reference images (§0.1) are included below. The images themselves live in `docs/img/` in the repo; open them if you can, but the descriptions are sufficient to build from.

---

## 0. Glossary

Use these terms exactly in UI text, identifiers and comments, and avoid the words listed under _Avoid_.

### The model

**Toss**: A single observed outcome, Heads (H) or Tails (T).
_Avoid_: observation, emission (as a noun for the data), flip

**Toss sequence**: The ordered tosses we actually see; the observed data.
_Avoid_: observations, input, data string

**Coin state**: The hidden coin in use at a toss: Fair (F) or Biased (B).
_Avoid_: hidden state, label, regime

**Coin path**: Any assignment of a coin state to every toss in a toss sequence. Each coin path is one row of the enumeration table and one route through the trellis.
_Avoid_: hidden path (in UI), state sequence, q, route (as a noun in UI)

**Starting probabilities**: The probability that the first toss uses each coin state.
_Avoid_: initial distribution, priors, pi

**Transition probabilities**: The probability of the coin state at one toss given the coin state at the previous toss.
_Avoid_: switch probabilities, A matrix

**Emission probabilities**: The probability of H or T given the coin state.
_Avoid_: output probabilities, b, coin bias

### The three questions

**Likelihood**: The probability of the toss sequence summed over every coin path — "how likely are the tosses?"
_Avoid_: evidence, marginal, score

**Joint probability**: The probability of one specific coin path together with the toss sequence.
_Avoid_: path probability, path score

**Posterior**: The probability the coin was Biased at toss t, given the whole toss sequence — "which coin at toss t?" The probability of Fair is its complement, not a separate posterior.
_Avoid_: confidence, belief, smoothed probability

**Viterbi path**: The coin path with the highest joint probability — "which sequence of coins is most likely?"
_Avoid_: most likely path, best path, decoded path, hidden path

### Teaching artefacts

**Enumeration table**: The table listing every coin path for a short toss sequence with its per-toss factors and joint probability; summing, filtering and maximising it answers all three questions by brute force.
_Avoid_: output table, path table

**Trellis**: The two-row (F/B) by n-column grid of coin states for a toss sequence: transition probabilities on the arrows, emission probabilities of the observed tosses in the nodes. It holds every coin path at once. Tracing one coin path through it gives that path's joint probability; filling its nodes with the Viterbi or forward recursion answers the questions without listing paths.
_Avoid_: grid, lattice, DP table, flowchart, path diagram

**Precision method**: How products of many small probabilities are kept representable: Naive, Rescaled, or Log-space.
_Avoid_: scaling option, numeric mode

**Underflow**: A probability too small for a double (below ~1e-308) collapsing to exactly 0.
_Avoid_: overflow, precision loss

Lecture notation is kept in equations: δₜ(s) (Viterbi value), φₜ(s) (Viterbi backpointer), αₜ(s) / βₜ(s) (forward / backward), Pr(q, tosses) (joint probability of coin path q).

### 0.1 Reference images (in `docs/img/` in the repo)

All five show the lecture defaults (§3).

**`docs/img/path_trellis.png` — the trellis with coin path F F F traced** (the model for Tab 1's trellis in Stages 1–2, §6).
- Same geometry as `hidden_path.png` below: a **start** circle, three columns headed **"t = 1: Tail"**, **"t = 2: Tail"**, **"t = 3: Head"**, Fair on top and Biased below, four arrows between consecutive columns labelled 0.95 / 0.05 / 0.20 / 0.80 and two start arrows labelled 0.5.
- Each node holds only the coin state name (bold) and, in purple, the emission probability of that column's toss (Fair 0.5; Biased 0.9 on Tails, 0.1 on Heads). No δ or α values.
- The arrows and nodes of coin path F F F are drawn thick and highlighted; all other arrows are thin.
- Below: a legend "edges: transition probabilities · nodes: emission probability of the observed toss", then the product line `F F F: 0.5 · 0.5 × 0.95 · 0.5 × 0.95 · 0.5 = 0.0564`. (In the slide the path is orange and called a "route"; the app uses its own selection colour and says "coin path", §6.)

**`docs/img/three_questions.png` — "Three questions, answered from the table"** (the content of Tab 1's question cards, §6 Stage 2).
- A three-column table with a dark navy header: **Question | In symbols | From the 8 rows**.
- Row 1: "1. How likely are the tosses?" | `Pr(o | λ)` | "add all rows: 0.1389".
- Row 2: "2. Which coin at toss t?" | `Pr(qₜ = Sᵢ | o, λ)` | "rows with B at toss 2, divided by the sum: 0.0603 / 0.1389 = 0.43".
- Row 3: "3. Which sequence of coins?" | `argmax_q Pr(q | o, λ)` | "the largest row: F F F".
- Footnote under the table: "Dividing every row by the same sum does not change which row is largest."
- The symbols are in math type, with **o** and **q** in bold. Reproduce their content and layout; exact styling may differ.

**`docs/img/hidden_path.png` — "Viterbi by hand, toss 3 of T T H"** (the model for the Viterbi pass in "Speeding it up", §6b, drawn there on a taller version of the `path_trellis.png` trellis).
- Title at top-left, underlined by a thick yellow rule.
- Left: a small circle labelled **start**. Two thick arrows, each labelled **0.5**, go from it to the two nodes of the first column.
- Three columns headed **"t = 1: Tail"**, **"t = 2: Tail"**, **"t = 3: Head"**. Each column has two circular nodes, **Fair** on top and **Biased** below. Each node holds three lines: the coin state name (bold), the emission probability of that column's toss in small purple text (`b = 0.5` for Fair; `b = 0.9` for Biased on Tails, `b = 0.1` for Biased on Heads), and the node's δ value in bold: t = 1: F **0.25**, B **0.45**; t = 2: F **0.119**, B **0.324**; t = 3: F **0.0564**, B **0.0259**.
- Between consecutive columns there are four arrows: horizontal F→F labelled **0.95** and B→B labelled **0.80**, plus crossing diagonals F→B labelled **0.05** and B→F labelled **0.20**.
- Winning arrows are thick and dark navy. Between t = 1 and t = 2 the losing diagonals (F→B, B→F) are thin and pale grey-blue (faded). Between t = 2 and t = 3, the column being computed, the losing diagonals are thin but still dark: all candidates are visible while they are compared, and the winners (F→F, B→B) are thick.
- The column being computed (t = 3) has a pale yellow highlight behind it.
- Below the diagram are two equations, in large math type, with a curly under-brace beneath each candidate product labelled "from F" and "from B":
  `δ₃(F) = max(0.119 · 0.95, 0.324 · 0.20) · 0.5 = 0.0564,   φ₃(F) = F`
  `δ₃(B) = max(0.119 · 0.05, 0.324 · 0.80) · 0.1 = 0.0259,   φ₃(B) = B`

**`docs/img/output-table.png` — enumeration table for T T H** (the model for Tab 1's table, §6 Stage 1).
- The header row is dark navy with white bold text: **Hidden path | toss 1: T | toss 2: T | toss 3: H | Pr(q, T T H)**. In the app, label the first column "Coin path" per the glossary.
- Eight body rows with alternating white / light-grey stripes. Factor cells are in serif math type as "transition · emission" (toss 1: "start · emission"). The last column shows the joint probability to 4 decimals:

  | Coin path | toss 1: T | toss 2: T | toss 3: H | Pr(q, T T H) |
  |---|---|---|---|---|
  | F F F | 0.5 · 0.5 | 0.95 · 0.5 | 0.95 · 0.5 | **0.0564** |
  | F F B | 0.5 · 0.5 | 0.95 · 0.5 | 0.05 · 0.1 | 0.0006 |
  | F B F | 0.5 · 0.5 | 0.05 · 0.9 | 0.20 · 0.5 | 0.0011 |
  | F B B | 0.5 · 0.5 | 0.05 · 0.9 | 0.80 · 0.1 | 0.0009 |
  | B F F | 0.5 · 0.9 | 0.20 · 0.5 | 0.95 · 0.5 | 0.0214 |
  | B F B | 0.5 · 0.9 | 0.20 · 0.5 | 0.05 · 0.1 | 0.0002 |
  | B B F | 0.5 · 0.9 | 0.80 · 0.9 | 0.20 · 0.5 | 0.0324 |
  | B B B | 0.5 · 0.9 | 0.80 · 0.9 | 0.80 · 0.1 | 0.0259 |
  | **Sum** | | | | **0.1389** |

- The maximum (0.0564, row F F F) and the Sum row ("Sum" and 0.1389) are in bold navy. The other probabilities are in bold black.

**`docs/img/posterior-chart.png` — posterior vs Viterbi path for the 20-toss example** T H T H T T H T T T T T T H T T T T T T (the model for Tab 2's posterior chart at short lengths, §7.3).
- A two-line legend sits above the plot. Line 1: a navy dash "Posterior Pr(biased | tosses)" and an ochre/brown dash "Viterbi path (0 = fair, 1 = biased)". Line 2: "Toss", a hollow circle "Head", and a filled black circle "Tail".
- The plot panel has a thin dark border and light-grey gridlines. The x-axis is "toss t" with integer ticks 1–20. The y-axis runs from 0.00 to 1.00 with ticks every 0.25. A dotted grey horizontal reference line sits at 0.50.
- The posterior is a navy polyline with a marker at each toss: filled black circles for Tails, hollow white circles with black outlines for Heads (tosses 2, 4, 7, 14). Values are listed in §10.
- The Viterbi path is an ochre step line at 0 from toss 1 up to toss 8, where it jumps vertically to 1 and stays there through toss 20.
- Notice: at toss 8 (0.459) and toss 14 (0.497) the posterior is below 0.5 while the Viterbi path is at 1 (B). These are the disagreement tosses in §7.3.

---

## 1. Audience and goal

Students learning HMMs for the first time. The app must make each computation *visible*: where every number comes from, which candidate wins, and why. Correctness and clarity beat visual flourish.

The model: a dealer tosses a coin; the coin is either Fair (F) or Biased (B) and the dealer occasionally swaps it. We see only the tosses.

Four tabs, in this order (this document keeps the names Tab 1 for the first and Tab 2 for the long-sequence tabs, §7):
- **Tab 1 — "How HMMs work"**: tiny sequences (1–4 tosses). Brute-force enumeration table → the three questions answered from it.
- **"Speeding it up"** (§6b): the same toss sequence; the same three questions answered by the trellis passes instead of the list — forward pass (Q1), forward + backward pass (Q2), Viterbi pass + backtrack (Q3) — each checked against the brute-force answer.
- **"Posterior vs Viterbi path"** (§7.3): 1–5000 tosses. "Which coin at each toss?" — posterior vs Viterbi path with a reading guide.
- **"Long sequences"** (§7.4): the same toss sequence. The precision comparison: why naive breaks, drawn and tabulated.

---

## 2. Tech stack and constraints

- **Vanilla JavaScript (ES modules) + D3 v7**, built with **Vite**, tested with **Vitest**. No React or other UI framework. (Rationale: the state is tiny — parameters, two sequences, step positions — and almost all work is SVG drawing that D3 should own outright; a virtual-DOM framework would compete with D3 for the same nodes.)
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
    fit.js                # scale the app to fill the window (1×–2×)
    tab1/ trellisGeom.js, pathTrellis.js, enumerationTable.js, questions.js
    speed/ speed.js, speedSteps.js, speedTrellis.js, speedPanels.js   # "Speeding it up"
    tab2/ sequenceInput.js,
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

With two states and two symbols, each row has exactly one free value. The parameter panel exposes **five** controls — P(start F), P(F→B), P(B→F), P(H | F), P(H | B) — each a slider paired with a numeric input (step 0.01 on the slider; the numeric input accepts any value in [0, 1]). Complements are derived and displayed read-only next to each control (e.g. "F→F = 0.95"). A "Reset to lecture defaults" button restores the table above **and the Tab 1 toss sequence (`TTH`)**. It leaves the Tab 2 sequence alone, so a long pasted sequence is not lost. The sidebar help text says so.

- One **shared** parameter panel for both tabs, in a collapsible left sidebar.
- Values of exactly 0 and 1 are allowed. Every algorithm must handle zero probabilities correctly (log 0 = −∞, never NaN in the stable methods).
- Any parameter change recomputes everything immediately and resets Tab 1 and "Speeding it up" step-through to the start (and Tab 2's chart zoom).

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
- When the sequence was simulated, keep `truePath`; report "Viterbi agreement with true coin: xx.x%" above the Tab 2 chart. When the sequence was typed/pasted, there is no truth: hide the metric.

---

## 5. Algorithms (`src/hmm/`)

All functions are pure and return full tables (not only final answers) because the UI animates them.

### 5.1 Brute-force enumeration (`enumerate.js`)

For sequences of length n ≤ 12 (UI uses ≤ 4; tests use ≤ 8). Lists all 2ⁿ coin paths in lexicographic order with F before B (FFF, FFB, FBF, …, BBB — matching `docs/img/output-table.png` (§0.1)). For each path return per-toss factors `[{trans or start, emit}]` and the joint probability. Also return likelihood (sum), and helpers for posterior-by-filtering and argmax.

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
- Tab 2: values derived from logs, shown as scientific notation `3.1 × 10⁻⁸⁰⁰` (mantissa/exponent computed from the log — never by exponentiating). (Used by the precision panel; Tab 2 no longer has a trellis to display δ.)

---

## 6. Tab 1 — "How HMMs work"

### One-screen layout

All of Tab 1 — and, with the same frame, "Speeding it up" (§6b) — fits on one screen with no page scrolling at **1440×900** (about 800 px of usable height) with the sidebar open, for n ≤ 3, at every step. At n = 4 the table compresses its rows but may scroll a little.

**Scale to fit (whole app, all tabs):** the layout is designed for a 1280 × 800 CSS-px area. Larger windows zoom the whole app (header, sidebar, all tabs) by `min(window height / 800, window width / 1280)`, clamped to **1×–2×**, so the height is filled and the extra width goes to the flexible parts. It never shrinks below 1×; smaller windows keep the behaviour above. Each Tab 1 / "Speeding it up" trellis also widens its column spacing to fill its card, so a wide window does not leave empty margins. Any canvas drawing multiplies its backing resolution by the scale, and Tab 2's brush-to-zoom must land on the same tosses at any scale. There is no intro paragraph, and the app header carries only the title and the tabs (no tagline). Top to bottom:

```
[Toss sequence T T H] │ ◀ Back  Next ▶  Reset  Fill all │ Stage 1 of 2 · Enumeration table · 5 / 8 rows
  caption (one area for whichever stage is active, about two lines)
┌ trellis (full width) ─────────────────────────────────────────────────┐
│ start → … nodes …                                                     │
│ product line                                              legend      │
└───────────────────────────────────────────────────────────────────────┘
┌ enumeration table (content width) ┐ ┌ the three questions (cards) ────┐
└───────────────────────────────────┘ └─────────────────────────────────┘
```

- **Step bar:** the toss-sequence input (1–4 tosses, default TTH; its parse error wraps onto a second line of the bar), **Back / Next / Reset**, **Fill all** (active only in Stage 1 before the table is complete), and a progress label that names the stage ("Stage 2 of 2 · The three questions · 2 / 3"). The keyboard hint (← / → / Space) is a tooltip on Back/Next. There are no per-stage headings.
- **Caption:** a single caption area under the bar, with text from `content/text.js`, about two lines tall even when the text is shorter, so the layout does not jump.
- **One trellis** (§0.1 `path_trellis.png`), about 195 px tall, used only to trace coin paths. The legend ("arrows: transition probabilities · nodes: emission probability of the observed toss") sits at the bottom right, beside the product line.
- **Table and questions side by side:** the enumeration table at its content width, and the question cards in the remaining width (at least 340 px). When the main area is too narrow for both, the cards wrap under the table; that is the one case where the page scrolls at n ≤ 3.

### Stage 1 — Enumeration table

Matches `docs/img/output-table.png` (§0.1): columns *Coin path | toss 1: x₁ | … | toss n: xₙ | Pr(q, tosses)*, one row per coin path, then a **Sum** row.

- Each Next fills **one row**: its factor cells (`0.5 · 0.5`, `0.95 · 0.5`, …; toss 1 uses start · emit, later tosses use trans · emit), then its joint probability.
- After the last row, Next fills the Sum row (= likelihood).
- At n = 4 there are 16 rows; the table must fit without horizontal scroll at 1024 px.

**The trellis** (matches `docs/img/path_trellis.png` (§0.1)): each node shows only the coin state and the emission probability of the observed toss (no δ/α), and the arrows show transition probabilities. The line under it shows each row's calculation:
- **Before row 1:** nothing traced; the line explains (in body text) that each row is one coin path through the trellis.
- **After each Next:** the row just filled is traced (arrows and nodes thick, navy with the yellow highlight; all other arrows faded), and the line reads `Pr(F F F, T T H) = 0.5 · 0.5 × 0.95 · 0.5 × 0.95 · 0.5 = 0.0564`, one "transition · emission" group per toss in table-column order. That row gets the same yellow highlight with a navy edge in the table, so the two read as linked. Because the line carries the row's arithmetic, the caption only says "Row k of n is filled…".
- **After the Sum row:** nothing traced, every arrow at full strength, and the line reads `Pr(T T H) = sum over all 8 coin paths through the trellis = 0.1389`.
- **Picking a row:** clicking any filled row (or Enter/Space on its focused coin-path cell, ↑/↓ to move) traces that row instead, until the next step control is used.
- Ochre (`--viterbi`) is used on this trellis only when a coin path is presented as the Viterbi path (question 3). An ordinary traced row is never ochre.
- The word "route" is not used in the UI; say "coin path".

### Stage 2 — The three questions

Matches the content of `docs/img/three_questions.png` (§0.1), laid out as three compact **cards** beside the table under the heading "The three questions — answered from the n rows". Each card has the question (button) with the slide's notation right-aligned (`Pr(o | λ)`, `Pr(qₜ = Sᵢ | o, λ)`, `arg max_q Pr(q | o, λ)`), then the concrete live answer. Card 2 has its toss picker on the question line. The footnote "Dividing every row by the same sum does not change which row is largest." sits under the cards.

- **Before the table is complete** the cards are visible but inactive (dimmed, not clickable) with the note "Fill the table to answer these." instead of the footnote. Once the Sum row is filled, clicking a card enters Stage 2 on that question.
- In Stage 2, answers start empty. **Each Next reveals one question in order** (Q1 → Q2 → Q3) and makes it the current question. After the third, the Next button reads **"Speeding it up →"** and switches to that tab on Q1 at its first step; the caption says brute force is done and the next tab gets the same answers without the list. Clicking a card reveals that answer and makes it current. Revealed answers stay filled; Back hides the most recently revealed one.
- Only the current question is highlighted: the card itself, the enumeration table, and the trellis:

| Question | Answer (TTH) | Enumeration table | Trellis |
|---|---|---|---|
| 1. How likely are the tosses? | add all 8 rows: 0.1389 | Sum row | every arrow at full strength; "sum over all 8 coin paths" |
| 2. Which coin at toss t? (picker, default t = 2) | rows with B at toss 2, divided by the Sum: 0.0603 / 0.1389 = 0.434 = Pr(B at toss 2); so Pr(F at toss 2) = 0.566 | rows with B at toss t, and the Sum row | the Biased node at toss t; "every coin path through Biased at toss t is a highlighted row" |
| 3. Which sequence of coins is most likely? | the largest row: F F F (0.0564) | max row (ochre tint) | that coin path traced in ochre, labelled "Viterbi path"; card 3 in ochre tint |

- The posterior is always Pr(**B** at toss t), as in the glossary and Tab 2's chart; Pr(F) appears only as its complement.
- The caption carries the longer derivation for the current question. Q3's caption: "This needed all 2ⁿ rows. The trellis finds the same row without listing them."

Use the lecture notation (δₜ, φₜ, αₜ, Pr(q, …)) in equations; render with plain HTML/SVG text and Unicode subscripts — no LaTeX library is required unless trivial to add.

---

## 6b. "Speeding it up"

The three questions again, on the same toss sequence as Tab 1 (one shared sequence, 1–4 tosses; editing it in either tab changes both), but answered by the **trellis passes** (glossary: forward pass, backward pass, Viterbi pass, backtrack) instead of the list of coin paths. Priority, as in Tab 1: it must be obvious where every number comes from.

### Layout (same frame as Tab 1, one screen for n ≤ 3)

```
[Toss sequence T T H] │ ◀ Back  Next ▶  Reset  Fill all │ [Q1 How likely? · Forward | Q2 Which coin? · Forward–backward | Q3 Which sequence? · Viterbi] step 4 / 7
  caption
┌ trellis (full width, taller nodes) ─────────────────────────────────────────────────────┐
│ equation(s) for the node being computed                                      legend    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
┌ trellis values: rows F / B, one column per toss ┐ ┌ answer card for the selected question ┐
└─────────────────────────────────────────────────┘ └───────────────────────────────────────┘
```

- The **question toggle** (Q1 / Q2 / Q3) is in the step bar because it changes every panel. Each button names the question and, underneath, the method that answers it (Forward, Forward–backward, Viterbi); the answer card's heading repeats the method. **Each question remembers its own step**; switching away and back resumes where it was. Changing the toss sequence or any parameter resets all three. "Fill all" jumps to the last step of the current question; "Reset" to its start.
- **Values are plain probabilities** at 3 significant figures, as in Tab 1 (α₂(F) = 0.164, δ₂(F) = 0.119, β₂(F) = 0.48), so each ties back to sums or maxima of enumeration-table rows. With 1–4 tosses plain products cannot underflow. Logs and rescaling are left to Tab 2; each question's last caption says so in one line.
- **Trellis:** same geometry family as Tab 1 but taller nodes (name, `b = …`, and the value(s)); the current column is highlighted; arrows into not-yet-computed nodes are grey and dashed. Below it, the equations for **both coins of the current column** at 16 px with under-braces — the line for the node not yet computed is shown greyed with its terms and `= ?` (and `φ = ?`), and fills in on the next step; the legend for the current question at the bottom right.
- **Value table** (bottom left) fills cell by cell with the trellis; the cell being computed has a navy outline.
- **Answer card** (bottom right): the selected question with its slide symbol, one line on how this pass answers it, then — once the pass reaches the end — the answer and a **✓ check against brute force** (computed from the enumeration table, e.g. "✓ the Sum row in “How HMMs work” (0.1389)"). Before that: "Step through to the end of the pass to get the answer."
- Colours: forward pass / α in the trellis navy; **backward pass / β in teal (`--bwd`)**; posterior in the yellow highlight; Viterbi path ochre. Arrows always point left to right (they are transitions); during the backward pass the arrows used turn teal, and the direction of computation comes from the step order and the caption.

### Q1 — How likely are the tosses? (forward pass, 2n + 1 steps)

Each Next computes one node (αₜ(F) then αₜ(B), left to right): `α₂(F) = (0.25 · 0.95 + 0.45 · 0.20) · 0.5 = 0.164` with "from F"/"from B" under-braces; both incoming arrows stay full strength. The last step adds the last column: `Pr(T T H) = α₃(F) + α₃(B) = 0.111 + 0.0276 = 0.1389` ✓ the Sum row. Value table rows: α(F), α(B).

### Q2 — Which coin at toss t? (forward + backward pass + posterior, 5n − 1 steps, starting at step 2n)

- Q2 **starts with α already filled** (step 2n; the caption says it comes from Q1, and Back steps through the forward pass). The equation line shows `Pr(T T H) = α₃(F) + α₃(B) = 0.1389`, which every posterior divides by.
- Next: **βₙ(F) = βₙ(B) = 1** (no tosses left to explain), in one step.
- Then the **backward pass**, one node per Next, right to left (βₜ(F) then βₜ(B)): add over the arrows **out of** the node, each = transition · emission of the next toss at the node it lands on · that node's β, with "to F"/"to B" under-braces: `β₂(F) = 0.95 · 0.5 · 1 + 0.05 · 0.1 · 1 = 0.48`, `β₂(B) = 0.18`, `β₁(F) = 0.236`, `β₁(B) = 0.178`. The arrows used turn teal.
- Then the **posterior**, one toss per Next, left to right: `Pr(B at toss t) = αₜ(B) · βₜ(B) / Pr(T T H)` and the same for F (the two add to 1): 0.575, 0.434, 0.199 for B. A yellow bar under each Biased node fills to Pr(B) with its value.
- Nodes show α (navy) and β (teal) together, so both factors are visible while the posterior is computed. Value table rows: α(F), α(B), β(F), β(B), Pr(B at toss) (filled cells yellow).
- The answer card keeps Tab 1's **toss picker** (default t = 2); the picked toss's posterior cell is outlined. Answer: `α₂(B) · β₂(B) / Pr(tosses) = 0.335 · 0.18 / 0.1389 = 0.434 = Pr(B at toss 2)`, so Pr(F) = 0.566; ✓ the rows with B at toss 2 (0.0603 / 0.1389).

### Q3 — Which sequence of coins is most likely? (Viterbi pass + backtrack, 3n steps)

Matches `docs/img/hidden_path.png` (§0.1); this is the former Tab 1 Stage 3 Max mode, moved here. The backpointer is written **φ** (glossary: Backpointer; ψ in some textbooks).

- **Viterbi pass:** each Next computes one node, with both coins' lines visible as in the lecture slide: `δ₃(F) = max(0.119 · 0.95, 0.324 · 0.20) · 0.5 = 0.0564,  φ₃(F) = F` and `δ₃(B) = max(0.119 · 0.05, 0.324 · 0.80) · 0.1 = 0.0259,  φ₃(B) = B` (the second greyed with `= ?` until its step). The winning incoming arrow becomes bold; the losing one is dark while its column is current and then fades. Each node shows its δ and, from toss 2, its own **φ = F/B** as soon as it is computed. Value table rows: δ(F), δ(B), φ(F), φ(B) ("—" at toss 1), Viterbi path — δ and φ are tracked for both coins at every toss.
- **Backtrack**, one step per Next, right to left, shown in three linked places:
  1. *Trellis:* the node the backtrack stands on gets a thick ochre ring — at step 1 the winning node of the last column, afterwards the node whose φ is being read — and the arrow its φ names is drawn in ochre back to the previous column; nodes already on the path stay ochre.
  2. *Value table:* step 1 outlines both δ cells of the last column; later steps outline (ochre) the φ cell being read, and the Viterbi-path cell it fills is outlined.
  3. *Under the trellis:* the chain builds one line per step and stays visible: `toss 3: larger of δ₃(F) = 0.0564, δ₃(B) = 0.0259 → F`, `toss 2: φ₃(F) = F → F`, `toss 1: φ₂(F) = F → F`.
  The caption for each step says it in words ("We stand on F at toss 3 (ochre ring). Its backpointer φ₃(F) = F … so toss 2 is F").
- **"What if?" contrast** on the final step: starting the backtrack from the other coin at the last toss and following its backpointers is drawn as a dashed grey chain on the trellis, with one line `what if toss 3 were B? φ₃(B) = B, φ₂(B) = B → B B B, only 0.0259 < 0.0564`, showing why the end coin is chosen first by the larger δ.
- Answer: F F F, joint probability 0.0564 ✓ the largest row.

Use the lecture notation (δₜ, φₜ, αₜ, βₜ, Pr(q, …)) in equations; render with plain HTML/SVG text and Unicode subscripts.

---

## 7. Tab 2 — the long-sequence tabs: "Posterior vs Viterbi path" and "Long sequences"

Two tabs that **share one toss sequence** (1–5000 tosses, typed or simulated). Each starts with the same sequence card — its own short intro, then textarea (type or paste), length + seed + Simulate controls and a status line (n, source: typed/simulated) — and editing it in either tab changes both. Below the card, "Posterior vs Viterbi path" shows §7.3 and "Long sequences" shows §7.4. There is **no step-by-step Viterbi trellis** on either (no playback, overview strip or detail window): stepping through the passes is the job of "Speeding it up" (§6b); these tabs show the results on long sequences. Neither tab has keyboard stepping.

### 7.1–7.2 (removed)

The sliding-window Viterbi trellis and its playback were removed. Sections are kept numbered so references to §7.3 and §7.4 stay valid.

### 7.3 Tab "Posterior vs Viterbi path": "Which coin at each toss?"

Matches `docs/img/posterior-chart.png` (§0.1) at short lengths: x = toss t, y ∈ [0, 1]; posterior P(B | tosses) as a navy line; Viterbi path as an ochre step line (0 = F, 1 = B); dotted reference line at 0.5; legend as in the image.

- **Reading guide** above the chart (from `text.js`), four short bullets that use the current parameter values:
  1. *Navy line — the posterior:* for each toss on its own, the probability the Biased coin was in use given all the tosses (Q2 in "Speeding it up", forward–backward); near 0.5 means the tosses cannot tell.
  2. *Ochre steps — the Viterbi path:* the single most likely whole sequence of coins (Q3); every toss is exactly 0 or 1.
  3. *Dots — the tosses:* which way Heads and Tails move the line, worded from the current emission probabilities (Heads pull it down when P(H | B) < P(H | F), push it up when greater; with P(H | F) = P(H | B) a toss carries no information).
  4. *Shading — the two answers disagree:* switching coins costs a transition (current P(F→B), P(B→F)), so the best whole path does not switch away for one surprising toss; the Viterbi path is not the posterior rounded at 0.5.
- **Always fully computed and shown**, including the Viterbi step line (nothing is stepped through).
- **Scaling to long sequences:** when ≤ 100 tosses are in the visible x-range, draw a marker per toss (filled = Tail, hollow = Head). Above that, draw only the line, and show H/T as a thin rug of tick marks under the x-axis.
- **Zoom:** brush-to-zoom on the x-axis and a "Show all" reset; the x-range defaults to the full sequence.
- **Disagreement shading**: shade the background at tosses where the Viterbi path's state differs from the per-toss most likely coin (posterior > 0.5 ⇒ B, < 0.5 ⇒ F; exactly 0.5 is not a disagreement). There is no text under the chart; the reading guide's fourth bullet explains the shading. In the 20-toss lecture example this shades exactly tosses 8 (0.459) and 14 (0.497).
- If a true path exists (simulated sequence), report Viterbi agreement with the true coin above the chart.

### 7.4 Tab "Long sequences": precision comparison

Runs all three methods on the current Tab 2 sequence and shows a table with one column per method (Naive, Rescaled, Log-space) and rows:

| Row | Meaning |
|---|---|
| Log-likelihood | from forward; naive shows −∞ once it underflows |
| First underflow at toss | first t where a naive α (or δ) cell is exactly 0 while the log-space value is finite; "none" otherwise. N/A for the stable methods |
| NaN posteriors | count of tosses with NaN posterior |
| Viterbi path differs from log-space at | count of tosses |
| Smallest nonzero value stored | min positive raw number held in the method's tables |

Above the table, one sentence explaining what's happening, and a button **"Try n = 2000"** that simulates 2000 tosses with the current seed (at n = 500 with default parameters, naive usually survives; underflow typically appears somewhere around 700–1100 tosses). The explanation must name both failure modes: naive posteriors become NaN (0/0), and naive Viterbi compares 0 against 0, so the tie-break (prefer F) produces a wrong path — not NaN.

**The comparison drawn** (between the button and the table), in the order cause → consequence → fix:

- **A. How small the numbers get** (log-scale y-axis, x = toss). At each toss, the *smallest value naive has to store* — whichever of αₜ(F), αₜ(B), δₜ(F), δₜ(B) is smallest (usually a δ, since δ ≤ α); its first exact 0 is by construction the table's "First underflow" toss.
  - grey: its true size (from log-space), falling by a roughly constant amount per toss;
  - red: what naive stores — the same until it is stored as 0, then drawn in a "stored as 0" lane at the bottom;
  - navy: what rescaled stores instead (a number between 0 and 1, near the top);
  - a red line at the smallest normal double (≈ 10⁻³⁰⁸) with the band down to ≈ 10⁻³²⁴ shaded ("digits being lost, then exactly 0");
  - a dashed red marker "naive hits 0 at toss k" when it happens. When it does not (e.g. the default 500 tosses), the grey line is **projected** forward at its average rate (dashed) to where naive would store 0, labelled "at this rate, naive stores 0 from ≈ toss k" — and the note under the chart gives both crossings and points to "Try n = 2000". (Default seed: projected ≈ 1001 from 500 tosses vs actual 1003 at n = 2000.) Lines are clipped to the plot area.
- **B. Consequence strips**, on the same x-axis under A: *Naive posterior* (red where NaN — every toss once the likelihood is 0), *Naive Viterbi path* (red where it differs from log-space), *Rescaled vs log-space* (red where they disagree; normally "all fine"); each strip ends with its count ("70 tosses wrong" / "all fine").
- **D. One toss, three representations**: hovering anywhere on A or B moves a rule and fills a readout under the chart — the value's name and true size, what naive stores ("0 — the value is lost"), what rescaled stores plus the amount (in ln) it divided out, and what log-space stores (its ln). Default: the first-underflow toss, else the last toss.
- **Linked table**: hovering the "First underflow", "NaN posteriors" or "Viterbi path differs" row highlights its marker / strip on the chart. A hint above the table says so.
- A note under the chart explains the picture in words for the current run (survives with projection / fails at toss k: likelihood 0 ⇒ every posterior NaN even at toss 1; Viterbi only breaks after the underflow).

---

## 8. State, URL and text

- A tiny store holds: active tab, params, Tab 1 sequence, Tab 2 sequence source (`{seed, n}` or explicit tosses), Tab 1 / "Speeding it up" step positions, Tab 2 chart zoom.
- **Shareable URL** in `location.hash`, e.g. `#tab=speed&q=2&pf=0.5&fb=0.05&bf=0.2&hf=0.5&hb=0.1&t1=TTH&seed=615&n=500` or `…&seq=THTHTT…`. `tab` is `how`, `speed`, `compare` or `long`; old links with `tab=1` / `tab=2` still open "How HMMs work" / "Long sequences". `q=1|2|3` (only with `tab=speed`) is the selected question; step positions are not encoded. Encode an explicit Tab 2 sequence only if ≤ 200 tosses; longer typed sequences are not put in the URL (the URL then omits Tab 2's sequence). Invalid hash values fall back to defaults silently.
- **All teaching prose** (stage captions, per-step captions, question explanations, disagreement note, precision explanation, tooltips) lives in `src/content/text.js` as plain strings/template functions, so the author can edit wording without touching code. You draft the text; keep it short, plain, and in the lecture's notation.

---

## 9. Visual design

- Consistent colour for coin state across the app: one colour for **F**, one for **B** (colour-blind-safe pair, e.g. blue vs vermillion). Posterior line navy, Viterbi path ochre (as in `docs/img/posterior-chart.png` (§0.1)). Faded/losing arrows at ~25% opacity. Define colours as CSS custom properties.
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
- Plain backward values ("Speeding it up"): β₃ = (1, 1), β₂ = (0.48, 0.18), β₁ = (0.2361, 0.1776); αₜ(B)·βₜ(B) / likelihood equals filtering the enumeration table at every toss (0.575, 0.434, 0.199).
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

More than two coin states or more than two symbols; parameter learning (Baum–Welch); mobile/touch layouts; visualising the backward pass anywhere except "Speeding it up" (§6b); any backend, accounts or persistence beyond the URL; UI/e2e tests.

---

## 12. Acceptance checklist

- [ ] `npm test` passes all fixtures above; GitHub Action blocks deploy on failure.
- [ ] Site loads from GitHub Pages at `/hmm_viz/` with no console errors.
- [ ] "Reset to lecture defaults" restores the parameters and the Tab 1 toss sequence `TTH`, and leaves the Tab 2 sequence unchanged.
- [ ] Tab 1 at 1440×900 (sidebar open): no page scrolling in any stage for n ≤ 3. On larger windows (e.g. 1920×1080, 2900×1400) the app scales up to fill the window height with no large empty area, still without scrolling.
- [ ] Tab 1 with TTH: each Stage 1 step traces the filled row on the trellis (FFF first: 0.5 · 0.5 × 0.95 · 0.5 × 0.95 · 0.5 = 0.0564, matching `docs/img/path_trellis.png` (§0.1)), and clicking a filled row traces it.
- [ ] Tab 1 with TTH: stepping through reproduces `docs/img/output-table.png` (§0.1) row by row, the question cards (`docs/img/three_questions.png`) fill 0.1389 / 0.434 (Pr(F) 0.566) / FFF one Next at a time, and after Q3 Next reads "Speeding it up →" and opens that tab on Q1.
- [ ] "Speeding it up" with TTH: Q1 reproduces α₂ = 0.164 / 0.335 and ends at 0.1389 ✓; Q2 starts with α filled, gives β₂ = 0.48 / 0.18, β₁ = 0.236 / 0.178 and posteriors 0.575 / 0.434 / 0.199 ✓; Q3 reproduces the numbers and arrow fading of `docs/img/hidden_path.png` (§0.1) and ends on F F F, 0.0564 ✓. No page scrolling at 1440×900 for n ≤ 3 at any step.
- [ ] Tab 2 with the 20-toss example reproduces `docs/img/posterior-chart.png` (§0.1): the plotted posteriors equal §10's values, Heads hollow at tosses 2, 4, 7, 14, the Viterbi line rises at toss 8; tosses 8 and 14 shaded; the reading guide is shown above it.
- [ ] Tab 2 at n = 5000: simulate, brush-zoom and "Show all" stay responsive.
- [ ] Precision panel at n = 2000 shows naive failing (NaN posteriors, −∞ log-likelihood, wrong Viterbi tosses) while rescaled and log agree.
- [ ] Changing any parameter recomputes both tabs; a copied URL reopens the same tab, parameters and sequence.
- [ ] All teaching text is in `src/content/text.js`.
