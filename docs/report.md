# Emergent Complexity investigation

**Status:** automated survey and noise experiments completed. Expand the spatial examples and interpretation through hands-on use of the lab before submission.

## Question

How do local birth/survival rules produce different collective behavior, and how does persistent noise affect the behavior of selected rules?

The browser lab supports exploratory observation and reproducible comparisons. A visually interesting pattern is a starting point for investigation, not evidence of a general law.

## Methods

Use binary cells, eight Moore neighbors, and synchronous updates. The default domain is 128 × 128 with wrapping boundaries. Record any departure from this default. Under fixed dead boundaries, cells outside the grid are always dead.

Rules use `B…/S…` notation. Noise flips each cell independently after a deterministic rule update with probability `p`. Separate seeded random streams control initialization and noise. Save the exact configuration, initial state, seeds, engine version, and measurements with each cited experiment.

### Rule survey

Uniformly sample 100 distinct rules and record the sampling seed. Run each at initial densities 10%, 30%, and 50%, with three seeds per density, for 1,000 generations: 900 runs. Reuse initial grids across rules. Keep deliberately selected rules separate from the random sample.

Inspect time series and replay examples before assigning descriptive tags: extinction, stability, oscillation, growth, disorder, or mobility. Do not stop all runs at an empty grid: `B0` rules may produce live cells on the next update. Select at least one surveyed rule for further investigation and explain the selection.

For the automated research run, the selection criterion is the largest variance of final-500-generation mean activity across the nine starting conditions, restricted to sampled rules with overall mean activity strictly between 0.02 and 0.8. This deliberately selects sensitivity to initial conditions for follow-up; it does not establish that the rule is uniquely complex. The survey sampling seed is 2026, initialization seeds are 1–3, and noise seeds are initialization seed + 1000.

### Noise experiment

Compare Conway, HighLife, and the selected rule using `p = 0, 0.0001, 0.001, 0.01, 0.05`, ten matched initialization seeds, 30% initial density, and 2,000 generations per condition: 150 runs for three rules. Summarize the last 500 generations and show variability across independent trials, not only a pooled average. Compare each noisy trajectory with its matched noiseless run.

Noise trial initialization seeds are 1–10 and noise seeds are 1001–1010. The same noise seed at different probabilities supplies matched random draws. Reported error bars are sample standard deviations of ten per-run time averages, not confidence intervals or standard deviations across the 500 individual generations.

If the coarse sweep suggests a transition, refine that interval and repeat at 64 × 64 and 256 × 256. Treat the result as an apparent transition under these conditions until further evidence supports a stronger claim.

### Measurements and interpretation

- **Density:** fraction of live cells at each generation.
- **Activity:** fraction of cells that changed between consecutive generations, including noise.
- **Matched-run difference:** fraction of disagreeing cells between paired runs at the same generation.
- **Visual evidence:** exported examples and notes describing recognizable structures, persistence, and interactions.

High activity is not itself complexity. Divergence from a noiseless trajectory does not necessarily mean all structure has disappeared. Finite duration can miss long transients or periods; finite grids and wrapping can create interactions absent on an unbounded plane. Repeated seeds reduce sampling uncertainty but do not remove these limits.

## Findings

The 100 sampled rules covered a broad range of final-500-generation activity. Using descriptive bands fixed after the run, 14 rules were nearly quiescent (mean activity below 0.1%), 25 had low activity (0.1–10%), 26 had intermediate activity (10–50%), and 35 had high activity (at least 50%). These bands organize this sample; they are not established cellular-automaton classes. No rule had zero mean density across all nine runs, partly because `B0` rules can revive an empty grid.

`B345/S15` met the predeclared follow-up criterion. At 30% and 50% initial density, all six runs converged to approximately 45.6% density and 73.7% activity. At 10%, two seeds became nearly quiescent (activity 0.34% and 0.41%), while seed 3 remained active (46.8%). This is evidence of sensitivity to the tested initial configurations, not proof of multiple attractors or complex computation.

The noise experiment produced the following final-500-generation means across ten seeds. Full sample standard deviations are in the exported data and figure.

| Rule       | Flip probability | Density | Activity | Difference from noiseless control |
| ---------- | ---------------: | ------: | -------: | --------------------------------: |
| Conway     |                0 |   3.79% |    1.81% |                                0% |
| Conway     |           0.0001 |   6.25% |    4.45% |                             9.57% |
| Conway     |            0.001 |   7.23% |    5.90% |                            10.48% |
| Conway     |             0.01 |  13.68% |   13.01% |                            16.46% |
| Conway     |             0.05 |  31.94% |   32.69% |                            33.31% |
| HighLife   |                0 |   2.10% |    0.30% |                                0% |
| HighLife   |           0.0001 |   1.50% |    0.92% |                             3.53% |
| HighLife   |            0.001 |   3.32% |    2.93% |                             5.28% |
| HighLife   |             0.01 |  19.62% |   19.39% |                            20.89% |
| HighLife   |             0.05 |  34.68% |   36.47% |                            35.32% |
| `B345/S15` |                0 |  45.57% |   73.71% |                                0% |
| `B345/S15` |           0.0001 |  45.57% |   73.71% |                            49.63% |
| `B345/S15` |            0.001 |  45.62% |   73.65% |                            49.61% |
| `B345/S15` |             0.01 |  45.96% |   73.07% |                            49.65% |
| `B345/S15` |             0.05 |  47.05% |   70.97% |                            49.75% |

Conway and HighLife became denser and more active as noise increased over this coarse sweep. `B345/S15` behaved differently: aggregate density and activity changed little, even at `p = 0.05`, while noisy and noiseless arrangements differed at about half of all cells. This separates statistical robustness from trajectory robustness. A flip probability of 0.0001 was already enough for substantial long-run spatial divergence in every rule tested.

The five noise levels do not establish a sharp threshold. HighLife shows the clearest change between `p = 0.001` and `p = 0.01`, but a denser sweep and repeats at other grid sizes are needed before calling that a transition.

Evidence: [survey data](results/survey.json), [noise data](results/noise.json), and [noise figure](results/noise.svg). Both datasets record the engine-source hash, exact configurations, runtime, and summary window. They contain compact per-run summaries rather than complete trajectories.

## Engineering validation

Record the tested revision, environment, commands, outcomes, and any known failures. Relevant checks include known patterns, both boundaries, birth/survival decisions, deterministic seed replay, noise endpoints, saved-file round trips, and agreement between interactive and batch execution. Use browser tests for the principal controls and exports.

| Validation                         | Revision/environment                   | Outcome                         |
| ---------------------------------- | -------------------------------------- | ------------------------------- |
| Unit tests (`npm test`)            | Node 22.23.2                           | 37 passed                       |
| Production build (`npm run build`) | TypeScript 7 / Vite 8                  | Passed                          |
| Browser tests (`npm run test:e2e`) | Chromium / Playwright 1.61             | 9 passed                        |
| Full automated research            | Intel Core Ultra 7 155H / Node 22.23.2 | Survey: 389.2 s; noise: 254.3 s |

Performance measurements must name the computer/browser and workload. Do not extrapolate one machine's result to every user's device.

## AI assistance and authorship

| Contribution                                                                               | Review required                                                                 |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Codex proposed the development roadmap and experiment defaults.                            | Confirm alignment with the assignment and available time.                       |
| Codex generated implementation, tests, and documentation with delegated development tasks. | Review code and verify recorded test results.                                   |
| This report structure and notebook were AI drafted.                                        | Replace placeholders with the author's observations, analysis, and conclusions. |

Record later assistance here, including material changes to methods or interpretation. AI-generated suggestions are not experimental evidence.

## Conclusions and next questions

Simple rule changes produced markedly different long-run statistics under matched starting conditions. Persistent noise strongly altered Conway and HighLife in this experiment. For `B345/S15`, density and activity were statistically robust even while the precise trajectory was not. This makes it a useful example of why robustness needs an explicit definition.

The strongest immediate follow-up is a finer HighLife sweep between `p = 0.001` and `p = 0.01`, repeated on 64 × 64 and 256 × 256 grids. Visual inspection should then ask whether the measured change corresponds to recognizable structures disappearing. Later directions include a rule atlas, recovery after a single perturbation, multiple cell states, and 3D systems.
