# Observation notebook

Copy the entry below for each useful observation; keep exported JSON, CSV, and images with a stable name that matches the entry. Initial automated observations are recorded below; they do not replace visual exploration.

## Initial pattern checks

**Conditions:** 128 × 128, wrapping boundaries, centered preset, no noise, four generations. Both Conway (`B3/S23`) and HighLife (`B36/S23`) were checked using the application engine.

| Preset  | Observed live cells | Changed cells per step | Repeat observation                                         |
| ------- | ------------------- | ---------------------- | ---------------------------------------------------------- |
| Block   | 4 throughout        | 0                      | Identical to initial state at every checked generation.    |
| Blinker | 3 throughout        | 4                      | Returns to the exact initial state at generations 2 and 4. |
| Glider  | 5 throughout        | 4                      | Does not return to the initial state by generation 4.      |

The two rules agree on these short preset trajectories. This does not imply agreement for arbitrary starts: the additional six-neighbor birth condition still needs a setup that exercises it. To reproduce, load each named preset and step four times under each rule. For longer investigation, export a run and inspect the spatial movement as well as the live-cell count.

## Saved blob observations

The eight `results/observation-*.json` files record the new blob, takeover, decay, and percolation examples. Their `initialGrid` field is the exact beginning of the run; `generation` records when the observation was made. Replaying that beginning under the saved rule, boundary, seeds, and noise reproduces the observed generation. The measured comparison and interpretation are in [Finding interesting structure](complexity-directions.md).

## Entry template

- **Date / title:**
- **App revision or engine version:**
- **Question or prediction:**
- **Rule / boundary / grid size:**
- **Initial pattern or density / initialization seed:**
- **Noise probability / noise seed:**
- **Generations observed:**
- **Saved experiment / CSV / screenshot:**
- **What happened:** describe visible behavior and measured changes.
- **Interpretation:** separate the observation from possible explanations.
- **Repeat check:** vary seeds, density, grid size, or duration as appropriate.
- **Next experiment:**

## Starting prompts

1. In Conway, compare a block, blinker, and glider. Record persistence, period, or displacement before trying random starts.
2. Compare Conway and HighLife from the exact same initial grid. Locate the first differing generation and connect it to the rules.
3. For a surveyed rule, distinguish a transient from sustained behavior by extending a saved run.
4. Compare wrapping and fixed boundaries for the same setup. Note when an edge first affects the result.
5. Compare a noiseless run with a matched noisy run. Does trajectory divergence coincide with loss of recognizable structure?

These prompts are proposed experiments, not completed observations. Save surprising counterexamples as carefully as examples that fit the prediction.
