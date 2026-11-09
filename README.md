# Crooked Casino HMM Explorer

A static, browser-based teaching tool for hidden Markov models. A dealer tosses a coin that is either Fair (F) or Biased (B) and occasionally swaps it; we see only the tosses.

- **How HMMs work** (1–4 tosses): enumeration table → the three questions, answered by brute force.
- **Speeding it up** (same tosses): the three questions answered by the trellis passes — forward (Q1), forward + backward (Q2), Viterbi + backtrack (Q3) — each checked against brute force.
- **Posterior vs Viterbi path** (1–5000 tosses): “which coin at each toss?”, with a reading guide and the disagreements listed.
- **Long sequences** (same tosses): the precision comparison drawn — how small the numbers get against the smallest double, where naive breaks, and what rescaled / log-space store instead — plus the table.

The full brief is in [SPEC.md](SPEC.md); the vocabulary is in [CONTEXT.md](CONTEXT.md).

## Running locally

Requires **Node.js 20 or newer** (22 LTS recommended).

```bash
npm install        # first time only (uses package-lock.json)
npm run dev        # start the dev server, then open the URL it prints:
                   #   http://localhost:5173/hmm_viz/
```

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the Vitest suite (pure model code in `src/hmm/`) |
| `npm run test:watch` | Re-runs tests on save |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves `dist/` at `http://localhost:4173/hmm_viz/` |

Note the `/hmm_viz/` path: Vite's `base` is set to the repository name for GitHub Pages.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` runs on every push to `main`: `npm ci` → `npm test` → `npm run build` → deploy `dist/`. A failing test stops the job before anything is deployed.

One-time setup: on GitHub open **Settings → Pages** and set **Source** to **GitHub Actions**. The site is then served at `https://<user>.github.io/hmm_viz/`.

## Project layout

```
index.html
src/
  main.js                 boot, tab switching, store wiring, URL sync, keyboard
  styles.css              all colours are CSS custom properties in :root
  hmm/                    PURE (no DOM / D3), fully unit-tested
    model.js  enumerate.js  viterbi.js  forwardBackward.js  precision.js
    simulate.js  parse.js  format.js
  state/  store.js (pub/sub)  url.js (location.hash)
  ui/     paramsPanel.js  equation.js  fit.js
    tab1/ tab1.js  trellisGeom.js  pathTrellis.js  enumerationTable.js  questions.js
    speed/ speed.js  speedSteps.js  speedTrellis.js  speedPanels.js
    tab2/ tab2.js  sequenceInput.js
          posteriorChart.js  precisionPanel.js  precisionChart.js
  content/text.js         ALL teaching prose, captions, tooltips
test/                     Vitest suites (lecture fixtures, brute force, precision, edge cases)
```

To change any wording, edit `src/content/text.js` only.

## Choices made where the spec is silent

- **Parameter changes** reset "How HMMs work" to the start of Stage 1, every "Speeding it up" question to its start (the selected question is kept), and the Tab 2 chart zoom.
- **Simulated sequences follow the parameters.** A Tab 2 sequence simulated from `{seed, n}` is re-simulated with the same seed when a parameter changes. This keeps the shareable URL (which stores seed and n, not the tosses) faithful. To study fixed data under different parameters, paste it into the textarea; typed sequences never change.
- **Playback pauses at the end of the forward pass.** Press ▶ or ▶| to start the backtrack. ⏭ jumps to the end of the forward pass; pressing it again finishes the backtrack. Pressing ▶ after the backtrack is complete restarts from column 0.
- **Keyboard:** ← / → step back / forward in the active tab. Space is Next in "How HMMs work" and "Speeding it up" ("Long sequences" has no stepping). Keys are ignored while typing in a text field.
- **Tab 1 Stage 1:** each Next fills one row; its factor cells then its joint probability fade in left to right.
- **Speeding it up:** arrows into not-yet-computed nodes are drawn grey and dashed so the whole trellis structure is visible from the start. Each question remembers its own step; the answer card's ✓ is computed by comparing with the enumeration table, not hard-coded.
- **Long sequences** has no step-by-step trellis (that is “Speeding it up”); its chart is always fully drawn, with a reading guide worded from the current parameters and the disagreements listed toss by toss.
- **Overview strip** row 1 is "best so far" (argmax δₜ per revealed column). Row 2 fills in from the right during the backtrack.
- **Disagreement shading** appears together with the Viterbi step line, i.e. once the backtrack finishes (or after ⏭ ⏭).
- **Precision panel:** "NaN posteriors" counts every non-finite posterior. "Smallest nonzero value stored" has no meaning for log-space, which stores logarithms, so that column shows the smallest ln value instead.
- **Impossible sequences** replace that tab's results with "This toss sequence is impossible under these parameters." The inputs stay usable.
- **Extra button:** "Lecture 20-toss example" loads `THTHTTHTTTTTTHTTTTTT` in Tab 2.
- **URL:** state is written to `location.hash` (debounced). Typed Tab 2 sequences longer than 200 tosses are left out of the URL. Editing the hash by hand, or pasting a share link into an open tab, reloads the app from it.
- **Lecture likelihood:** the exact value for T T H is 0.138945, shown as 0.1389. The spec's "0.13895" is a rounding of it, and the tests check both the 4-d.p. lecture value and the exact one.
