# Finding persistent, interacting structure

The next question should be: **Which rules support localized structures that persist, move, and interact without simply filling the available space?** Density and activity are useful search filters, but neither identifies those properties. The follow-up below is measured; the later metric and literature sections propose further work.

## What the current evidence says

Filtering the saved [900 survey runs](results/survey.json) for final-500-generation mean density of 5–20% and activity of 10–40% yields exactly one run: `B368/S1348`, initial density 10%, initialization seed 1, with 13.6205% density and 10.0787% activity. This is a candidate to replay, not an established complex rule. Averaging all initial conditions together could hide such candidates; inspect individual runs as well as rule summaries.

These axes are mathematically coupled. If `rho_t` is density and `A_t` is the fraction of changed cells, counting births and deaths gives:

`abs(rho_(t+1) - rho_t) <= A_t <= min(rho_t + rho_(t+1), 2 - rho_t - rho_(t+1))`.

At roughly constant density, activity cannot exceed `2 min(rho, 1-rho)`. Thus 5% density permits at most about 10% activity. A small moving object on a large board will have extremely low global density and activity despite being an interesting object. Keep the proposed range as an optional filter, not a complexity definition.

Survival does not require net growth: a Life blinker persists, and a glider translates without increasing its population over its period. Symmetric rules also permit asymmetric patterns and motion. Rotating the initial configuration rotates its trajectory; it does not force every trajectory to be radial. Conversely, apparently fluid behavior is not sufficient evidence against organization: coherent structures can be embedded in disordered backgrounds. Crutchfield and Hanson explicitly demonstrated filtering of chaotic CA domains to expose their boundaries and particles. [Turbulent pattern bases for cellular automata](https://www.sciencedirect.com/science/article/pii/016727899390092F).

## Measured follow-up: growth hidden by averages

The selected `B368/S1348` run was already at **22.33% density at generation 1,000**, above the proposed range despite its 13.62% late-window mean. Continuing the original 128² torus to generation 3,000 reached **40.25% density and 33.28% activity**. Thus its original score captured a growth transient, not a demonstrated persistent low-density regime.

I then centered the _complete_ generation-1,000 snapshot in empty, fixed-dead domains, with no noise, and ran each for 1,000 more generations. This is a whole-state padding experiment, not extraction or identification of an individual blob. Removing the original toroidal seam also changes neighborhood relationships at the snapshot's edges, so compare the three padded domains to each other rather than attributing their difference from the torus solely to size.

| Domain | Final live cells | Final occupied extent | Final global density | Final activity |
| ------ | ---------------: | --------------------- | -------------------: | -------------: |
| 256²   |            9,520 | 199 × 192             |               14.53% |         12.25% |
| 512²   |            9,520 | 199 × 192             |                3.63% |          3.06% |
| 1024²  |            9,520 | 199 × 192             |                0.91% |          0.77% |

All started with 3,659 live cells and 128 × 128 extent. Their population and extent measurements agreed at every recorded ten-step sample, and none reached its boundary. Continued increases through the final samples support ongoing growth over this window; they do not prove unbounded future growth. Enlarging the box did not stabilize this example. It simply diluted global density/activity, making the same observed growth process pass the proposed filter at 256² and fail at larger sizes.

Reproduce with `node scripts/blob-study.mjs`. See [measurements and exact protocol](results/blob-study.json); import [the generation-1,000 snapshot](results/blob-snapshot.json) in the app to explore it. This is a single selected initial condition, not a general classification of the rule or of other blobs you observed.

## Metrics worth adding, in order

First check for long transients: compare population and activity across several successive late windows, and report their slopes. A favorable average during expansion can disappear on a longer run. Global occupancy filters should apply only to comparable domain sizes and initialization protocols.

| Measurement                                                          | What it helps distinguish                                              | Main limitation                                                                  |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Component sizes and largest-component share                          | Several separate objects versus one spreading mass                     | Connectivity alone does not identify an object; touching objects merge           |
| Object lifetime, area change, centroid displacement                  | Persistent moving objects versus growth fronts or flickering fragments | Track splits/merges explicitly; displacement alone can reflect asymmetric growth |
| Recurrence after translation, at several time lags                   | Oscillators and spaceships versus irregular change                     | A recurring object is a useful primitive, not proof of rich interactions         |
| Spatial correlations at several distances and local density variance | Spatial organization versus shuffled occupancy at the same density     | Regular stripes also have strong correlations                                    |
| Short-history information storage and directional transfer maps      | Local memory and propagation through the field                         | Statistical estimation and confounding require controls                          |

For an initial object analysis, define components using the eight-neighbor geometry of the simulator, report the boundary convention, and inspect both live-cell and changed-cell masks. Track at every generation for shortlisted examples so fast events are not skipped. Report distributions of sizes and lifetimes, not just their mean. A practical first comparison is population, occupied bounding-box area, displacement, and recurrence for an isolated seed; add more elaborate identity tracking only if those observations justify it.

Information theory is useful when the question concerns **relationships across space and time**:

- Single-cell Shannon entropy is just the binary entropy of density. It adds no independent information to the existing density metric. Independent random frames have high entropy without persistent organization; compression ratios alone also reward incompressibility.
- Excess entropy measures information shared by a process's past and future. Active information storage asks how much a site's recent past predicts its next state. In CA studies, storage highlights blinkers and background domains, so high storage alone does not identify the desired interactions. [Lizier, Prokopenko and Zomaya, 2012](https://www.prokopenko.net/uploads/2/1/7/6/21762362/infostoragev2.2.pdf).
- Transfer entropy asks whether a neighbor's past improves prediction beyond the target's own past. Its local values can highlight propagating particles; this is a good conceptual match for motion and collisions. Pairwise transfer is predictive dependence, not proof of causation: shared inputs and synergistic inputs matter. [Lizier, Prokopenko and Zomaya, 2008](https://arxiv.org/abs/0809.3275).
- Statistical complexity concerns the information needed to represent predictive causal states; it is distinct from entropy and excess entropy. Local causal states group past light cones by their distributions over future light cones, allowing background symmetries and localized deviations to be identified. This is promising but a substantially larger inference project, especially in 2D. [Shalizi and Crutchfield](https://arxiv.org/abs/cond-mat/9907176), [Rupe and Crutchfield](https://arxiv.org/abs/1801.00515).

Start with short histories, report history length and sample count, estimate on comparable settled windows, and check held-out data. Compare against spatially shuffled frames preserving density and temporally shuffled sequences; different shuffles destroy different relationships. Include blank, blinker, glider, and independently randomized-frame controls. Pooling sites or time windows with different regimes can manufacture apparent dependence, so inspect local maps and replicate variability. Avoid combining these measurements into a single weighted “complexity score” before validating them.

An intermediate level of activity is a reasonable search preference, but “edge of chaos” should remain a hypothesis. Mitchell, Crutchfield and Hraber's re-examination found that influential evidence linking computational ability to a particular transition parameter did not reproduce as originally interpreted. [Dynamics, Computation, and the Edge of Chaos](https://arxiv.org/abs/adap-org/9306003).

## A focused next experiment

1. Replay `B368/S1348` under the condition above, plus two or three saved growing-blob examples. Keep Life's blinker and glider as positive controls for persistence and translation. Preserve exact snapshots and seed metadata.
2. Crop one blob with a recorded margin and center the identical crop in initially empty 128, 256, 512, and, if practical, 1024 square grids. Use fixed dead boundaries and no noise initially. Restrict this empty-background experiment to rules without `B0`; birth-at-zero rules do not preserve an empty exterior.
3. Record population, occupied extent, centroid displacement, local occupancy, and recurrence every generation. Run a common 2,000-generation observation window, but stop interpreting a run as isolated once its activity reaches the boundary. Increase the box for candidates censored this way. For a radius-one rule, influence travels at most one cell per generation; a large grid is still not an infinite plane.
4. Distinguish bounded oscillation or translation from increasing radius and population. A larger empty box can reveal emitted particles and delay collisions, but cannot by itself balance an outward-moving growth front. Global density will fall automatically when padding the same object, so compare object-scale measurements rather than the 5–20% filter here.
5. For persistent candidates, test rotated copies, small initial perturbations, and two-object encounters at recorded separations and orientations. Re-run the most interesting results across more initial seeds or extracted examples. Keep this search separate from the original uniformly sampled survey.

## Reframe noise around survival and recovery

The current data already show macroscopic effects for two rules: at `p = 0.01`, mean density increases from 3.79% to 13.68% in Life and from 2.10% to 19.62% in HighLife. `B345/S15` instead retains similar density/activity while spatial arrangements diverge. These are different kinds of robustness, as recorded in the [report](report.md).

If two arrangements were independent with densities `r` and `s`, their expected disagreement would be `r + s - 2rs`. Near 45.6% density this is about 49.6%, close to the observed noisy/control disagreement for `B345/S15`. This calculation is a useful baseline, not evidence that the arrangements actually are independent.

For persistent blobs, measure survival probability, recovery time, displacement, and area change after a **single local perturbation**, then separately test continuous noise. Use several independent noise realizations per seed. For continuous noise, `p` is per cell: expected flips per generation are `p × width × height`. At `p = 0.0001`, this is 1.64 flips on 128² cells and 104.86 on 1024². Enlarging the empty region therefore introduces more spontaneous disturbances. Report both fixed per-cell probability and, as a separate intervention, fixed expected flips or noise confined to a recorded object neighborhood. These answer different questions.

Refine the existing HighLife interval with `p = 0.001, 0.002, 0.003, 0.005, 0.007, 0.01` and repeats at several sizes only after defining the structural outcome of interest. Smooth changes, finite-size effects, and long transients can resemble a threshold; density changes alone do not establish a phase transition.

## A possible later branch

If bounded, deformable, self-propelled blobs become the central aim, Lenia is a directly relevant alternative rule family: its continuous states and generalized neighborhoods support diverse autonomous patterns. SmoothLife is another continuous-domain extension. Both change the model and should be an explicit later comparison, rather than quietly replacing the binary-CA investigation. [Chan's Lenia paper](https://arxiv.org/abs/1812.05433), [Rafler's SmoothLife paper](https://arxiv.org/abs/1111.1567).
