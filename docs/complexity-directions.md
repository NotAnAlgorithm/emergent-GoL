# Finding interesting structure

The practical question is: **which rules create structures that persist, move, grow, or interact without merely turning into uniform noise or filling the board?** Density and activity help narrow a search, but they cannot answer this by themselves.

## What the saved runs show

The first survey found one run in the suggested range of 5–20% density and 10–40% activity: `B368/S1348`, 10% initial density, seed 1. Its final-window means were 13.62% density and 10.08% activity. However, it had reached 22.33% density by generation 1,000 and 40.25% by generation 3,000. The attractive average described a growth phase rather than a stable sparse state.

Padding its complete generation-1,000 state into larger empty fixed-boundary boards made the problem clearer:

| Board | Population after 1,000 more steps | Occupied extent | Density | Activity |
| ----- | --------------------------------: | --------------: | ------: | -------: |
| 256²  |                             9,520 |       199 × 192 |  14.53% |   12.25% |
| 512²  |                             9,520 |       199 × 192 |   3.63% |    3.06% |
| 1024² |                             9,520 |       199 × 192 |   0.91% |    0.77% |

The population and extent were identical at every recorded sample, and no pattern reached a boundary. Only the amount of empty space changed. Global density and activity therefore depend strongly on board size when behavior is localized.

The new saved observations give useful contrasting examples. Replaying their exact starting states produced these descriptors:

| Observation                         | Density trend | Active area | Patch 32 | Largest component |
| ----------------------------------- | ------------: | ----------: | -------: | ----------------: |
| `B4568/S034578`, early noisy growth |  +79.00 pp/1k |       56.9% |    0.116 |              7.0% |
| `B4568/S034578`, blobs dying        |  -20.69 pp/1k |       18.6% |    0.105 |              9.7% |
| `B36/S236`, percolating moss        |   -0.31 pp/1k |       99.9% |    0.002 |              1.3% |
| `B3/S01347`, monotonic blobs        |  +22.70 pp/1k |       31.7% |    0.218 |             12.1% |

These are individual runs, not classifications of whole rules. Still, the combination is promising: both growing-blob examples have strong positive trends and coarse patchiness, while the percolating example has almost no trend, almost no coarse patchiness, and activity across nearly the whole board. The dying example has similar spatial clustering but a negative trend.

Two longer runs show why the measurements must stay separate. A settled `B4568/S034578` run had almost no density trend, Patch 32 of 0.312, and 84.7% of live cells in its largest component. Another run later in its takeover still grew by 4.01 percentage points per 1,000 steps and had 99.0% of its live cells connected. Clean and noisy `B368/S1348` runs grew by 20.84 and 29.08 points per 1,000 respectively under the saved conditions, consistent with the observation that noise accelerated growth in that example.

## Metrics now reported by the app

The survey table exposes each measurement separately so it remains interpretable and filterable.

- **Density and activity trend:** least-squares change per 1,000 generations over the final 500 steps, or the whole run if shorter. Positive density trend finds growth; negative trend finds decay. A near-zero value finds settled averages, including stable, periodic, and chaotic states.
- **Active area:** fraction of cells that changed at least once during the final 64 steps. This separates local activity from board-wide churn. It does not say whether the changing region is coherent.
- **Patch 8 and Patch 32:** variation in local tile density after subtracting the variation expected from randomly placed live cells at the same density. Fine-scale and coarse-scale values help separate small texture from large clustered regions.
- **Components and largest component:** number of eight-neighbor live-cell components and the largest component's share of all live cells. This distinguishes scattered objects from a connected mass, although a percolating random field can also form a large component.
- **Active flip variation:** exported results include the variation in flip rates among active cells over the final 64 steps. It measures whether active cells behave alike or at different rates.

No single column means “complexity.” A useful blob search can start with positive density trend, positive Patch 32, and active area well below 100%, then use component measurements and replay to reject uniform growth fronts. A microscopic search should instead look for low or moderate active area, many small components, little long-term drift, and visible persistence or movement.

Conway and HighLife show why a separate microscopic search matters. Small still lifes, oscillators, and spaceships can be interesting while contributing almost nothing to global density. Survival also does not require growth: a blinker persists at fixed population, and a glider moves without growing. Symmetric rules permit directional motion because an individual starting pattern can be asymmetric.

## Next experiments

1. Use the broad or wide survey at 10% initial density to find more rules. Filter first by trend, active area, and Patch 32. Repeat every candidate with more seeds and at least one other density before interpreting it.
2. Continue saved growing examples for several equal windows. A trend that changes sign or approaches zero may indicate bounded growth; a persistent positive trend suggests takeover or continuing expansion.
3. Extract one blob with a recorded margin and place the identical state in several empty, fixed-boundary boards. Record population, occupied extent, component structure, and boundary contact. Do this without noise first and exclude `B0` rules, because they do not preserve an empty exterior.
4. For bounded objects, test rotated copies and pairs at several separations. Persistence, displacement, and repeatable collision outcomes are stronger evidence of organized behavior than appearance alone.
5. Add recurrence under small translations for shortlisted rules. It can detect stationary oscillators and moving spaceships without letting empty background dominate the comparison.

Noise should be split into two questions. A **single local perturbation** tests survival and recovery. Continuous per-cell noise tests behavior under ongoing disturbance, but the number of expected flips grows with board area: at `p = 0.0001`, it is about 1.64 flips per step on 128² and 104.86 on 1024². When comparing sizes, also consider a fixed expected number of flips or noise limited to the object's neighborhood.

## Later information-theoretic work

Single-cell entropy is only another expression of density, and random states can have high entropy without structure. More useful methods study relationships over time. Active information storage measures how much a cell's past predicts its next state; local transfer entropy can highlight propagating particles and collisions. [Lizier, Prokopenko and Zomaya](https://arxiv.org/abs/0809.3275) demonstrate local information transfer as a filter for cellular-automaton structure.

Local causal states offer a deeper way to separate background domains from coherent deviations, but applying them in two dimensions is a substantial inference project. [Rupe and Crutchfield](https://arxiv.org/abs/1801.00515) provide the relevant framework. These methods are best applied after the simpler metrics identify a small set of rules and controls.

If bounded, deformable, self-propelled blobs become the main goal, [Lenia](https://arxiv.org/abs/1812.05433) is a useful later comparison. It changes the model from binary cellular automata to continuous states and neighborhoods, so it should remain a clearly separate branch.

Reproduce the padding study with `node scripts/blob-study.mjs`. The full measurements are in [blob-study.json](results/blob-study.json), and [blob-snapshot.json](results/blob-snapshot.json) can be imported into the app.
