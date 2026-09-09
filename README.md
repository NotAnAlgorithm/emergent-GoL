# Emergent Complexity Lab

A browser laboratory for exploring binary outer-totalistic cellular automata: Conway's Life, HighLife, custom rules, reproducible rule surveys, and noise experiments. Built with TypeScript, Vite, and Canvas; simulations and saved experiments stay in your browser.

## Run locally

Use Node.js 22 or newer and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To verify changes:

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The production build is written to `dist/`. Browser installation is required once per environment for the end-to-end tests.

## Explore

1. Start with Conway (`B3/S23`) or HighLife (`B36/S23`), then draw cells or load a pattern. Try a seeded random start at several densities.
2. Play, pause, or advance one generation. Restore the initial state to repeat an experiment.
3. Change birth/survival counts using rule notation or toggles. `B3/S23` means dead cells are born with three neighbors; live cells survive with two or three.
4. Compare wrapping boundaries with fixed dead boundaries. Record the boundary choice when interpreting an observation.
5. Save interesting runs with notes. Download experiment JSON for replay, measurement CSV for analysis, and a screenshot for the notebook.
6. Use the experiment tools to survey sampled rules or compare noise conditions. Keep exported results alongside your observations.

The default grid is 128 × 128. Updates are synchronous, using the eight-cell Moore neighborhood. Noise independently flips each cell after the normal update with probability `p`; `p = 0` is noiseless. Initialization and noise use separate seeded random streams.

## Suggested investigation

- **Survey:** 100 distinct sampled rules × densities 10%, 30%, 50% × three seeds, each for 1,000 generations. Reuse starting grids across rules for comparison.
- **Noise:** Conway, HighLife, and one surveyed rule × `p = 0, 0.0001, 0.001, 0.01, 0.05` × ten matched seeds, each for 2,000 generations at 30% initial density. Summarize the final 500 generations.
- **Follow-up:** refine any interesting noise interval and repeat at 64 × 64 and 256 × 256 before drawing conclusions about a transition.

Density is the live-cell fraction. Activity is the fraction of cells changed during a generation. Neither alone measures complexity. Classifications describe the tested conditions, not universal properties of a rule. Finite grids and boundaries can alter behavior; empty states can revive under `B0` rules, so emptiness is not a general stopping condition.

Use [the observation notebook](docs/observations.md) during exploration and [the report template](docs/report.md) to separate reproducible findings from hypotheses. Browser storage is local to the site and browser profile and can be cleared; exported files are the portable backup. There are no accounts or server-side backups.

To reproduce the checked-in research data with the same application engine:

```sh
npm run research
```

This requires Node.js 22.13 or newer, runs all 900 survey and 150 noise trials, and rewrites `docs/results/`. Allow several minutes depending on hardware. JSON files record every configuration, final-500-generation summary, aggregated sample standard deviations, runtime, and a SHA-256 hash of the engine sources. The SVG chart can be opened independently or included in a report. Node may print an experimental warning for its built-in TypeScript stripping API.

## Publish

The GitHub Actions workflow tests and builds pushes to `main`, then publishes the static artifact using GitHub Pages. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. Vite uses relative asset paths, so the build works beneath the repository's `/emergent-GoL/` Pages path.

Adding the workflow does not enable Pages or prove the site has deployed. Check the deployment job and its reported URL after pushing. Pull requests run validation without publishing.
