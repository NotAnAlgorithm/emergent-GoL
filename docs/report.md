# Emergent Complexity investigation

Build simple web app to quickly test various Game of Life configurations/rule sets with the addition of random noise.

## Question

How do local birth/survival rules produce different collective behavior? Which measurements separate localized growth and persistent small structures from uniform noise or percolation, and how does noise change them?

## Methods

Use binary cells, eight Moore neighbors, and synchronous updates. The default domain is 128 × 128 with wrapping boundaries. Record any departure from this default. Under fixed dead boundaries, cells outside the grid are always dead.

Rules use `B…/S…` notation. Noise flips each cell independently after a deterministic rule update with probability `p`. Separate seeded random streams control initialization and noise. Save the exact configuration, initial state, seeds, engine version, and measurements with each cited experiment.

### Rule survey

Uniformly sampled 100s of distinct rules and record the sampling seed. Run each at initial densities 10%, 30%, and 50%, with three seeds per density, for 1,000 generations. Reuse initial grids across rules. Keep deliberately selected rules separate from the random sample.

### Noise experiment

Compare Conway, HighLife, and the selected rules using `p = 0, 0.0001, 0.001, 0.01, 0.05`.

### Measurements and interpretation

- **Density:** fraction of live cells at each generation.
- **Activity:** fraction of cells that changed between consecutive generations, including noise.
- **Matched-run difference:** fraction of disagreeing cells between paired runs at the same generation.
- **Trend:** fitted density or activity change per 1,000 generations over the final 500 generations.
- **Active area:** fraction of cells that changed at least once during the final 64 generations.
- **Patchiness:** excess variance in 8 × 8 or 32 × 32 tile densities above random occupancy with the same global density.
- **Components:** eight-neighbor live-cell component count and the largest component's share of the population.
- **Visual evidence:** exported examples and notes describing recognizable structures, persistence, and interactions.

No single measurement is a complexity score. Positive trend can mean blob growth or uniform takeover. Patchiness can mean a blob or simple phase separation. A large component can be a coherent object or percolation. Use the measurements together, replay candidates, and repeat them under matched conditions.

## Findings

Import my [selected observations](results/interesting-observations.json) into the web app Notebook to get the bulk of my findings. Overall, most rules died/stabilized quickly or became fluctuations noise/percolation; only a small few had interesting behavior with semi-stable structures that slowly grew. After manually looking at dozens of rules, I found that there was decent correlation between the existence of a change in activity/density over time (ie doesnt collapse instantly) and these interesting blobs.

Noise didn't seem to impact things that much, it mainly did what one would expect: increased instability/volatility and accelerated change/activity. One thing worth noting was that the semi-stable blob/cell-like structures I outlined above were generally resilient to noise, though noise did obviously increase variance.

## AI assistance and authorship

I specified the specs and goals of the project, and AI wrote the entire codebase. I iteratively gave feedback on metrics to measure, reproducibility, option tweaking, optimizations, etc, but AI was able to infer a surprising amount. AI was also quite zealous and generated its own report and readme drafts, which I discarded for the most part. It wasn't able to observe the macroscopic behavior of simulations (cells, percolation, etc) that I did, nor was it able to really proffer much insight into what to look for or test.

## Conclusions and takeaways

- I still feel like GoL's rules don't lend themselves to truly interesting emergent complexity; perhaps it is too simple or the unconstrained growth that limit it.
- The addition of perturbations/noise was surprisingly and disappointingly uninteresting.
- AI is very good at development, but coming up with ways to measure/describe complex/interesting things is very hard, so extensive manual combing was required.
- Many of the patterns were very mesmerizing to watch... might have lost a few hours to that.
- I'd be very curious what I would observe if I implemented 3D or multiple states, and combining them would be very interesting. Unfortunately, I wasn't able to all that this week.
- I wanted to explore it more from an information theoretic perspective, but wasn't able to do that for now.
- Got a bit too caught up watching related videos, and I felt like these paths are already well-trodden, so there wasn't much more to be done..
    - https://www.youtube.com/watch?v=QK_KZv-YyOc
    - https://www.youtube.com/watch?v=2g-CrQfYNtE
- However, I (still) do feel like this field of artificial life and emergent complexity is very fascinating.

