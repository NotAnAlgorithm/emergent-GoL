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
5. Save interesting runs with notes. Notebook discoveries can be exported individually or selected and exported together as an importable JSON bundle.
6. Use the experiment tools to survey sampled rules or compare noise conditions. A survey can pause after its active worker jobs finish and resume without losing results.

The default grid is 128 × 128. Updates are synchronous, using the eight-cell Moore neighborhood. Noise independently flips each cell after the normal update with probability `p`; `p = 0` is noiseless. Initialization and noise use separate seeded random streams.

Both experiment tables support column sorting and filtering. Text filters match substrings; numeric filters accept exact values, `>=10`, `<=20`, or inclusive ranges such as `5..20`. Percentages use their displayed 0–100 units. Replicate columns compare the mean, not its standard deviation. Filters combine across columns; reset clears them. Exports retain the full study.

Survey presets trade repeated starts for rule coverage: standard tests 100 rules × 9 starts, broad tests 500 × 2, wide tests 1,000 × 1, and the pilot tests 9 × 1. Broad and wide scans use 10% initial density. Use them to find candidates, then repeat promising rules with more seeds, densities, sizes, and longer runs.

Playback targets up to 1,000 generations/second and reports its achieved rate. Multiple generations run between redraws within a short frame budget; actual speed depends on grid size and noise. CSV retains the most recent 10,000 generations. Independent batch runs can use 1, 2, 4, 8, or 16 workers, with deterministic results regardless of completion order. Higher counts can consume substantial CPU and memory. A single world's successive generations remain sequential.

A local headless Chromium check on September 10, 2026 measured approximately 999, 346, 116, and 25 generations/second at 128², 256², 512², and 1024² respectively (Intel Core Ultra 7 155H, Playwright 1.61.1; Conway, 30% random start, no noise, target 1,000/s). The 9-run pilot at 128² for 1,000 generations took 2.95 seconds with one worker and 1.09 seconds with four. These short development-server measurements are illustrative, not cross-device guarantees; noisy comparisons also evolve a control grid and cost more.

The playground supports grids through 1024 × 1024. **Expand into empty space** centers the exact current state in a grid twice as wide and tall and begins a new experiment. Start with no noise and fixed dead boundaries when investigating isolated growth; `B0` rules do not maintain an empty background. Padding reduces global density automatically, so inspect live-cell counts and object size as well. Batch grids remain capped at 256 × 256 to limit retained data.

## Suggested investigation

- **Survey:** 100 distinct sampled rules × densities 10%, 30%, 50% × three seeds, each for 1,000 generations. Reuse starting grids across rules for comparison.
- **Noise:** Conway, HighLife, and one surveyed rule × `p = 0, 0.0001, 0.001, 0.01, 0.05` × ten matched seeds, each for 2,000 generations at 30% initial density. Summarize the final 500 generations.
- **Follow-up:** refine any interesting noise interval and repeat at 64 × 64 and 256 × 256 before drawing conclusions about a transition.

Density is the live-cell fraction. Activity is the fraction of cells changed during a generation. Neither alone measures complexity. Classifications describe the tested conditions, not universal properties of a rule. Finite grids and boundaries can alter behavior; empty states can revive under `B0` rules, so emptiness is not a general stopping condition.

Survey results also report density and activity trends over the final 500 generations, the area touched during the last 64 generations, excess density variation in 8 × 8 and 32 × 32 patches, component count, and the largest component's share of live cells. These are separate clues: trend finds growth, patchiness finds clustered regions, and activity coverage separates local change from board-wide churn. Filter several columns together rather than treating any one as a complexity score.

See [research directions and literature](docs/complexity-directions.md) for object-scale measurements, information storage/transfer, controlled blob experiments, and interpreting noise.

`node scripts/blob-study.mjs` reproduces the focused growth follow-up: it continues `B368/S1348` to generation 3,000 and pads its generation-1,000 snapshot into three larger empty domains. The saved notebook [snapshot](docs/results/blob-snapshot.json) can be imported into the playground.

Use [the observation notebook](docs/observations.md) during exploration and [the report template](docs/report.md) to separate reproducible findings from hypotheses. Browser storage is local to the site and browser profile and can be cleared; exported files are the portable backup. There are no accounts or server-side backups.

To reproduce the checked-in research data with the same application engine:

```sh
npm run research
```

This requires Node.js 22.13 or newer, runs all 900 survey and 150 noise trials, and rewrites `docs/results/`. Allow several minutes depending on hardware. JSON files record every configuration, final-500-generation summary, aggregated sample standard deviations, runtime, and a SHA-256 hash of the engine sources. The SVG chart can be opened independently or included in a report. Node may print an experimental warning for its built-in TypeScript stripping API.

## Publish

The GitHub Actions workflow tests and builds pushes to `main`, then publishes the static artifact using GitHub Pages. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. Vite uses relative asset paths, so the build works beneath the repository's `/emergent-GoL/` Pages path.

Adding the workflow does not enable Pages or prove the site has deployed. Check the deployment job and its reported URL after pushing. Pull requests run validation without publishing.
