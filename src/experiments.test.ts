import { describe, expect, it } from "vitest";
import { createRng, parseRule, patternGrid, randomGrid, step } from "./engine";
import {
  aggregateResults,
  compactResult,
  createRecord,
  exportRecord,
  exportRecords,
  importRecord,
  importRecords,
  measurementsCsv,
  noiseConfigs,
  runExperiment,
  sampleRules,
  surveyConfigs,
  type ExperimentConfig,
} from "./experiments";

const config: ExperimentConfig = {
  rule: "B3/S23",
  width: 8,
  height: 8,
  boundary: "wrap",
  density: 0.3,
  initialSeed: 42,
  noiseSeed: 99,
  noiseProbability: 0.01,
  generations: 12,
};
describe("experiment execution", () => {
  it("replays noisy trajectories exactly with independent noise and initial seeds", () => {
    expect(runExperiment(config)).toEqual(runExperiment(config));
    expect(runExperiment({ ...config, noiseSeed: 2 }).initialGrid).toEqual(
      runExperiment(config).initialGrid,
    );
  });
  it("agrees with interactive engine stepping", () => {
    let grid = randomGrid(8, 8, 0.3, 42);
    const rng = createRng(99);
    for (let i = 0; i < 12; i++)
      grid = step(grid, 8, 8, parseRule(config.rule), "wrap", 0.01, rng);
    expect(runExperiment(config).finalGrid).toEqual(Array.from(grid));
  });
  it("summarizes only the final 500 generations", () => {
    const result = runExperiment({
      ...config,
      width: 3,
      height: 3,
      generations: 520,
    });
    const tail = result.measurements.slice(20);
    expect(result.summary.density).toBe(
      tail.reduce((sum, m) => sum + m.density, 0) / 500,
    );
    expect(result.summary.activity).toBe(
      tail.reduce((sum, m) => sum + m.activity, 0) / 500,
    );
  });
  it("continues past empty grids under B0", () => {
    const result = runExperiment(
      {
        ...config,
        rule: "B0/S",
        width: 3,
        height: 3,
        noiseProbability: 0,
        generations: 1,
      },
      Array(9).fill(0),
    );
    expect(result.finalGrid).toEqual(Array(9).fill(1));
  });
  it("supports zero generations and rejects malformed input", () => {
    const result = runExperiment({ ...config, generations: 0 });
    expect(result.finalGrid).toEqual(result.initialGrid);
    expect(result.summary.activity).toBe(0);
    expect(() => runExperiment({ ...config, width: -1 })).toThrow();
    expect(() => runExperiment(config, [1])).toThrow();
  });
});
describe("study design", () => {
  it("samples unique reproducible rules across the complete rule space", () => {
    const rules = sampleRules(100, 7);
    expect(new Set(rules).size).toBe(100);
    expect(rules).toEqual(sampleRules(100, 7));
    expect(rules).not.toEqual(sampleRules(100, 8));
    expect(rules.some((rule) => parseRule(rule).birth.includes(0))).toBe(true);
    expect(() => sampleRules(262145, 1)).toThrow();
  });
  it("uses nine matched starting conditions across 100 surveyed rules", () => {
    const configs = surveyConfigs({
      width: 8,
      height: 8,
      generations: 3,
      samplingSeed: 5,
    });
    expect(configs).toHaveLength(900);
    expect(new Set(configs.map((c) => c.rule)).size).toBe(100);
    expect(configs.slice(0, 9).map(({ rule: _rule, ...c }) => c)).toEqual(
      configs.slice(9, 18).map(({ rule: _rule, ...c }) => c),
    );
  });
  it("supports broader surveys with fewer starts per rule", () => {
    const configs = surveyConfigs({
      width: 8,
      height: 8,
      generations: 3,
      samplingSeed: 5,
      ruleCount: 500,
      densities: [0.1],
      initialSeeds: [1, 2],
    });
    expect(configs).toHaveLength(1000);
    expect(new Set(configs.map((c) => c.rule)).size).toBe(500);
    expect(new Set(configs.map((c) => c.density))).toEqual(new Set([0.1]));
  });
  it("matches initial and noise streams across five noise levels", () => {
    const configs = noiseConfigs("B3/S23");
    expect(configs).toHaveLength(50);
    expect(new Set(configs.map((c) => c.noiseProbability)).size).toBe(5);
    expect(configs[0].initialSeed).toBe(configs[10].initialSeed);
    expect(configs[0].noiseSeed).toBe(configs[10].noiseSeed);
  });
});

describe("complexity descriptors", () => {
  const stillLife = Array(16 * 16).fill(0);
  for (const index of [17, 18, 33, 34]) stillLife[index] = 1;
  it("reports clustered components without inventing temporal activity", () => {
    const result = runExperiment(
      {
        ...config,
        width: 16,
        height: 16,
        boundary: "dead",
        generations: 64,
        noiseProbability: 0,
      },
      stillLife,
    );
    expect(result.summary.components).toBe(1);
    expect(result.summary.largestComponent).toBe(1);
    expect(result.summary.patchiness8).toBeGreaterThan(0);
    expect(result.summary.activeCoverage).toBe(0);
    expect(result.summary.densityTrend).toBeCloseTo(0);
  });
  it("separates disconnected objects and localized changing cells", () => {
    const cells = [...stillLife];
    for (const index of [221, 222, 237, 238]) cells[index] = 1;
    const components = runExperiment(
      {
        ...config,
        width: 16,
        height: 16,
        boundary: "dead",
        generations: 0,
        noiseProbability: 0,
      },
      cells,
    );
    expect(components.summary.components).toBe(2);
    expect(components.summary.largestComponent).toBe(0.5);

    const glider = Array.from(patternGrid("glider", 16, 16));
    const changing = runExperiment(
      {
        ...config,
        width: 16,
        height: 16,
        boundary: "dead",
        generations: 64,
        noiseProbability: 0,
      },
      glider,
    );
    expect(changing.summary.activeCoverage).toBeGreaterThan(5 / 256);
    expect(changing.summary.activeFlipSd).toBeGreaterThan(0);
  });
});
describe("experiment files", () => {
  it("round-trips exact initial states and reproduces the run", () => {
    const result = runExperiment(config);
    const saved = createRecord(
      config,
      result.initialGrid,
      "Trial",
      "Observation",
    );
    const imported = importRecord(exportRecord(saved));
    expect(imported).toEqual(saved);
    expect(runExperiment(imported.config, imported.initialGrid)).toEqual(
      result,
    );
    expect(measurementsCsv(result).split("\n")).toHaveLength(13);
  });
  it("round-trips notebook bundles and still imports single discoveries", () => {
    const first = createRecord(config, Array(64).fill(0), "First");
    const second = createRecord(config, Array(64).fill(1), "Second");
    expect(importRecords(exportRecords([first, second]))).toEqual([
      first,
      second,
    ]);
    expect(importRecords(exportRecord(first))).toEqual([first]);
    expect(() => exportRecords([])).toThrow(/Select/);
    expect(() =>
      importRecords(
        JSON.stringify({
          kind: "emergent-notebook",
          version: 2,
          records: [],
        }),
      ),
    ).toThrow(/bundle/);
  });
  it("rejects unsupported versions, invalid cells, and invalid metadata", () => {
    const saved = createRecord(config, Array(64).fill(0), "Trial");
    expect(() =>
      importRecord(JSON.stringify({ ...saved, version: 2 })),
    ).toThrow();
    expect(() =>
      importRecord(
        JSON.stringify({ ...saved, initialGrid: Array(64).fill(2) }),
      ),
    ).toThrow();
    expect(() =>
      importRecord(JSON.stringify({ ...saved, notes: null })),
    ).toThrow();
    expect(() => importRecord("{")).toThrow();
  });
});

describe("notebook validation", () => {
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII=";
  it("uses UI record fields and preserves screenshots and generation", () => {
    const record = createRecord(config, Array(64).fill(0), "Test", "", 7, png);
    expect(record.version).toBe(1);
    expect(record.engineVersion).toBe("1.0.0");
    expect(importRecord(exportRecord(record))).toEqual(record);
    expect(createRecord(config, Array(64).fill(0), "Test").generation).toBe(
      config.generations,
    );
  });
  it("rejects invalid image URLs and generation values", () => {
    const record = createRecord(config, Array(64).fill(0), "Test");
    for (const screenshot of [
      "https://example.com/image.png",
      "data:image/svg+xml;base64,AAAA",
      "data:image/png;base64,AAAA",
      png + "!",
    ]) {
      expect(() =>
        importRecord(JSON.stringify({ ...record, screenshot })),
      ).toThrow(/PNG/);
    }
    for (const generation of [-1, 0.5, 4294967296, null]) {
      expect(() =>
        importRecord(JSON.stringify({ ...record, generation })),
      ).toThrow(/Generation/);
    }
  });
  it("validates uint32 seeds and allows general grid dimensions", () => {
    expect(() =>
      runExperiment({ ...config, initialSeed: 4294967295, noiseSeed: 0 }),
    ).not.toThrow();
    for (const seed of [-1, 4294967296, 0.5]) {
      expect(() => runExperiment({ ...config, initialSeed: seed })).toThrow(
        /32-bit/,
      );
      expect(() => runExperiment({ ...config, noiseSeed: seed })).toThrow(
        /32-bit/,
      );
    }
    const small = { ...config, width: 3, height: 7 };
    expect(
      importRecord(
        exportRecord(createRecord(small, Array(21).fill(0), "Rectangle")),
      ).config,
    ).toEqual(small);
  });
  it("rejects records larger than 5 MB, counting UTF-8 bytes", () => {
    const record = createRecord(config, Array(64).fill(0), "Test");
    expect(() => importRecord(" ".repeat(5 * 1024 * 1024 + 1))).toThrow(/5 MB/);
    expect(() =>
      importRecord(
        JSON.stringify({ ...record, notes: "é".repeat(3 * 1024 * 1024) }),
      ),
    ).toThrow(/5 MB/);
  });
});

describe("noise comparisons and replicate summaries", () => {
  it("measures divergence from a matched noiseless trajectory", () => {
    const noisy = runExperiment(
      { ...config, width: 3, height: 3, noiseProbability: 1, generations: 1 },
      Array(9).fill(0),
    );
    expect(noisy.measurements[0].difference).toBe(1);
    expect(noisy.summary.difference).toBe(1);
    const clean = runExperiment({ ...config, noiseProbability: 0 });
    expect(clean.measurements.every((m) => m.difference === 0)).toBe(true);
    expect(clean.summary.difference).toBe(0);
  });
  it("compares evolving baseline grids at every generation", () => {
    const noisy = runExperiment(config);
    let baseline: Uint8Array = Uint8Array.from(noisy.initialGrid);
    let actual = baseline;
    const rng = createRng(config.noiseSeed);
    for (let i = 0; i < config.generations; i++) {
      baseline = step(
        baseline,
        config.width,
        config.height,
        parseRule(config.rule),
        config.boundary,
      );
      actual = step(
        actual,
        config.width,
        config.height,
        parseRule(config.rule),
        config.boundary,
        config.noiseProbability,
        rng,
      );
      const difference =
        baseline.reduce(
          (sum, cell, index) => sum + Number(cell !== actual[index]),
          0,
        ) / baseline.length;
      expect(noisy.measurements[i].difference).toBe(difference);
    }
  });
  it("groups rules, densities, and noise levels and uses sample standard deviation", () => {
    const base = runExperiment({ ...config, generations: 0 });
    const results = [0.2, 0.4, 0.6].map((value) => ({
      ...base,
      summary: {
        ...base.summary,
        density: value,
        activity: value / 2,
        difference: value,
      },
    }));
    const groups = aggregateResults([
      ...results,
      { ...base, config: { ...base.config, rule: "B36/S23" } },
      { ...base, config: { ...base.config, density: 0.1 } },
      { ...base, config: { ...base.config, noiseProbability: 0 } },
    ]);
    expect(groups).toHaveLength(4);
    expect(groups[0].count).toBe(3);
    expect(groups[0].densityMean).toBeCloseTo(0.4);
    expect(groups[0].densitySd).toBeCloseTo(0.2);
    expect(groups[0].activityMean).toBeCloseTo(0.2);
    expect(groups[0].activitySd).toBeCloseTo(0.1);
    expect(groups[0].differenceSd).toBeCloseTo(0.2);
    expect(groups[1].densitySd).toBe(0);
    expect(aggregateResults([])).toEqual([]);
  });
  it("keeps batch messages compact and separates unmatched conditions", () => {
    const full = runExperiment(config);
    const compact = compactResult(full);
    expect(compact).toEqual({
      config: full.config,
      initialGrid: full.initialGrid,
      summary: full.summary,
    });
    expect(compact).not.toHaveProperty("finalGrid");
    expect(compact).not.toHaveProperty("measurements");

    const variants = [
      compact,
      { ...compact, config: { ...config, width: 9 } },
      { ...compact, config: { ...config, height: 9 } },
      { ...compact, config: { ...config, boundary: "dead" as const } },
      { ...compact, config: { ...config, generations: 13 } },
    ];
    expect(aggregateResults(variants)).toHaveLength(5);
  });
});
