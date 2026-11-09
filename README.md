# Crooked Casino HMM Explorer

A static, browser-based teaching tool for hidden Markov models. A dealer tosses a coin that is either Fair (F) or Biased (B) and occasionally swaps it; we see only the tosses.

- **Tab 1 — How HMMs work** (1–4 tosses): enumeration table → the three questions → Viterbi / Forward trellis by hand.
- **Tab 2 — Long sequences** (1–5000 tosses): animated Viterbi trellis with a sliding window, posterior chart, precision comparison.

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
  ui/     paramsPanel.js  equation.js
    tab1/ tab1.js  enumerationTable.js  questions.js  trellisByHand.js
    tab2/ tab2.js  sequenceInput.js  overviewStrip.js  trellisWindow.js
          playback.js  posteriorChart.js  precisionPanel.js
  content/text.js         ALL teaching prose, captions, tooltips
test/                     Vitest suites (lecture fixtures, brute force, precision, edge cases)
```

To change any wording, edit `src/content/text.js` only.

## Choices made where the spec is silent

- **Parameter changes** reset Tab 1 to the start of Stage 1 (the Max/Sum choice is kept) and Tab 2 playback to column 0.
- **Simulated sequences follow the parameters.** A Tab 2 sequence simulated from `{seed, n}` is re-simulated with the same seed when a parameter changes. This keeps the shareable URL (which stores seed and n, not the tosses) faithful. To study fixed data under different parameters, paste it into the textarea; typed sequences never change.
- **Playback pauses at the end of the forward pass.** Press ▶ or ▶| to start the backtrack. ⏭ jumps to the end of the forward pass; pressing it again finishes the backtrack. Pressing ▶ after the backtrack is complete restarts from column 0.
- **Keyboard:** ← / → step back / forward in the active tab. Space is Next in Tab 1 and play/pause in Tab 2. Keys are ignored while typing in a text field.
- **Tab 1 Stage 1:** each Next fills one row; its factor cells then its joint probability fade in left to right.
- **Tab 1 Stage 3:** arrows into not-yet-computed nodes are drawn grey and dashed so the whole trellis structure is visible from the start. After the backtrack (Max) or the final sum (Sum), the matching row / Sum row of the enumeration table is highlighted.
- **Tab 2 detail window** shows as many columns as fit (odd, 9–25), reaching ~25 on wide screens or with the sidebar collapsed. Clicking/dragging the overview strip or clicking the posterior chart moves the window. Any playback step re-centres it on the cursor.
- **Overview strip** row 1 is "best so far" (argmax δₜ per revealed column). Row 2 fills in from the right during the backtrack.
- **Disagreement shading** appears together with the Viterbi step line, i.e. once the backtrack finishes (or after ⏭ ⏭).
- **Precision panel:** "NaN posteriors" counts every non-finite posterior. "Smallest nonzero value stored" has no meaning for log-space, which stores logarithms, so that column shows the smallest ln value instead.
- **Impossible sequences** replace that tab's results with "This toss sequence is impossible under these parameters." The inputs stay usable.
- **Extra button:** "Lecture 20-toss example" loads `THTHTTHTTTTTTHTTTTTT` in Tab 2.
- **URL:** state is written to `location.hash` (debounced). Typed Tab 2 sequences longer than 200 tosses are left out of the URL. Editing the hash by hand, or pasting a share link into an open tab, reloads the app from it.
- **Lecture likelihood:** the exact value for T T H is 0.138945, shown as 0.1389. The spec's "0.13895" is a rounding of it, and the tests check both the 4-d.p. lecture value and the exact one.
