import {
  createRng,
  formatRule,
  metrics,
  parseRule,
  randomGrid,
  step,
  type Boundary,
} from "./engine";

export interface ExperimentConfig {
  rule: string;
  width: number;
  height: number;
  boundary: Boundary;
  density: number;
  initialSeed: number;
  noiseSeed: number;
  noiseProbability: number;
  generations: number;
}
export interface Measurement {
  generation: number;
  density: number;
  activity: number;
  difference: number;
}
export interface RunResult {
  config: ExperimentConfig;
  initialGrid: number[];
  finalGrid: number[];
  measurements: Measurement[];
  summary: { density: number; activity: number; difference: number };
}
export type BatchResult = Pick<
  RunResult,
  "config" | "initialGrid" | "summary"
> & { tag?: string };
export interface SavedRecord {
  version: 1;
  engineVersion: "1.0.0";
  name: string;
  notes: string;
  generation: number;
  screenshot?: string;
  config: ExperimentConfig;
  initialGrid: number[];
}

export function validateConfig(
  value: unknown,
): asserts value is ExperimentConfig {
  if (!value || typeof value !== "object")
    throw new Error("Missing experiment configuration.");
  const c = value as ExperimentConfig;
  if (typeof c.rule !== "string") throw new Error("A rule is required.");
  parseRule(c.rule);
  for (const key of ["width", "height"] as const) {
    if (!Number.isInteger(c[key]) || c[key] < 1 || c[key] > 1024)
      throw new Error(`${key} must be an integer from 1 to 1024.`);
  }
  if (c.boundary !== "wrap" && c.boundary !== "dead")
    throw new Error("Invalid boundary mode.");
  for (const key of ["density", "noiseProbability"] as const) {
    if (!Number.isFinite(c[key]) || c[key] < 0 || c[key] > 1)
      throw new Error(`${key} must be between 0 and 1.`);
  }
  for (const key of ["initialSeed", "noiseSeed"] as const) {
    if (!Number.isInteger(c[key]) || c[key] < 0 || c[key] > 0xffffffff)
      throw new Error(`${key} must be an unsigned 32-bit integer.`);
  }
  if (
    !Number.isInteger(c.generations) ||
    c.generations < 0 ||
    c.generations > 100000
  )
    throw new Error("Generations must be an integer from 0 to 100000.");
}
function validateGrid(
  grid: unknown,
  config: ExperimentConfig,
): asserts grid is number[] {
  if (
    !Array.isArray(grid) ||
    grid.length !== config.width * config.height ||
    grid.some((cell) => cell !== 0 && cell !== 1)
  ) {
    throw new Error(
      "Initial grid must contain exactly width × height binary cells.",
    );
  }
}
export function runExperiment(
  config: ExperimentConfig,
  initialGrid?: number[],
): RunResult {
  validateConfig(config);
  if (initialGrid !== undefined) validateGrid(initialGrid, config);
  let grid = initialGrid
    ? Uint8Array.from(initialGrid)
    : randomGrid(
        config.width,
        config.height,
        config.density,
        config.initialSeed,
      );
  const initial = Array.from(grid);
  let baseline = grid;
  const rule = parseRule(config.rule);
  const rng = createRng(config.noiseSeed);
  const measurements: Measurement[] = [];
  for (let generation = 1; generation <= config.generations; generation++) {
    const next = step(
      grid,
      config.width,
      config.height,
      rule,
      config.boundary,
      config.noiseProbability,
      rng,
    );
    if (config.noiseProbability > 0)
      baseline = step(
        baseline,
        config.width,
        config.height,
        rule,
        config.boundary,
      );
    measurements.push({
      generation,
      ...metrics(grid, next),
      difference:
        config.noiseProbability > 0 ? metrics(baseline, next).activity : 0,
    });
    grid = next;
  }
  const tail = measurements.slice(-500);
  const summary = tail.length
    ? {
        density: tail.reduce((sum, m) => sum + m.density, 0) / tail.length,
        activity: tail.reduce((sum, m) => sum + m.activity, 0) / tail.length,
        difference:
          tail.reduce((sum, m) => sum + m.difference, 0) / tail.length,
      }
    : { ...metrics(grid, grid), difference: 0 };
  return {
    config: { ...config },
    initialGrid: initial,
    finalGrid: Array.from(grid),
    measurements,
    summary,
  };
}

export function sampleRules(count: number, seed: number): string[] {
  if (!Number.isInteger(count) || count < 0 || count > 2 ** 18)
    throw new Error("Rule count must be between 0 and 262144.");
  // Partial Fisher–Yates gives a uniform sample without replacement, including B0.
  const ids = Uint32Array.from({ length: 2 ** 18 }, (_, i) => i);
  const rng = createRng(seed);
  const rules: string[] = [];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (ids.length - i));
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const id = ids[i];
    rules.push(
      formatRule({
        birth: Array.from({ length: 9 }, (_, n) => n).filter(
          (n) => (id & (1 << n)) !== 0,
        ),
        survival: Array.from({ length: 9 }, (_, n) => n).filter(
          (n) => (id & (1 << (n + 9))) !== 0,
        ),
      }),
    );
  }
  return rules;
}
export function surveyConfigs(options: {
  width: number;
  height: number;
  generations: number;
  samplingSeed: number;
}): ExperimentConfig[] {
  return sampleRules(100, options.samplingSeed).flatMap((rule) =>
    [0.1, 0.3, 0.5].flatMap((density) =>
      [1, 2, 3].map((initialSeed) => ({
        rule,
        width: options.width,
        height: options.height,
        generations: options.generations,
        boundary: "wrap" as const,
        density,
        initialSeed,
        noiseSeed: initialSeed + 1000,
        noiseProbability: 0,
      })),
    ),
  );
}
export function noiseConfigs(
  rule: string,
  width = 128,
  height = 128,
  generations = 2000,
): ExperimentConfig[] {
  parseRule(rule);
  return [0, 0.0001, 0.001, 0.01, 0.05].flatMap((noiseProbability) =>
    Array.from({ length: 10 }, (_, i) => ({
      rule,
      width,
      height,
      generations,
      boundary: "wrap" as const,
      density: 0.3,
      initialSeed: i + 1,
      noiseSeed: i + 1001,
      noiseProbability,
    })),
  );
}
export function createRecord(
  config: ExperimentConfig,
  initialGrid: number[],
  name: string,
  notes = "",
  generation = config.generations,
  screenshot?: string,
): SavedRecord {
  const record: SavedRecord = {
    version: 1,
    engineVersion: "1.0.0",
    name,
    notes,
    generation,
    config: { ...config },
    initialGrid: [...initialGrid],
  };
  if (screenshot !== undefined) record.screenshot = screenshot;
  validateRecord(record);
  return record;
}
function validateRecord(value: unknown): asserts value is SavedRecord {
  if (!value || typeof value !== "object")
    throw new Error("Invalid experiment record.");
  const r = value as SavedRecord;
  if (r.version !== 1 || r.engineVersion !== "1.0.0")
    throw new Error("Unsupported experiment version.");
  if (typeof r.name !== "string" || typeof r.notes !== "string")
    throw new Error("Invalid experiment metadata.");
  if (
    !Number.isInteger(r.generation) ||
    r.generation < 0 ||
    r.generation > 0xffffffff
  )
    throw new Error("Generation must be an unsigned 32-bit integer.");
  if (r.screenshot !== undefined) {
    const prefix = "data:image/png;base64,";
    if (
      typeof r.screenshot !== "string" ||
      !r.screenshot.startsWith(prefix + "iVBORw0KGgo")
    )
      throw new Error("Screenshot must be a base64 PNG data URL.");
    const payload = r.screenshot.slice(prefix.length);
    if (payload.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload))
      throw new Error("Screenshot must be a base64 PNG data URL.");
  }
  validateConfig(r.config);
  validateGrid(r.initialGrid, r.config);
}
const MAX_RECORD_BYTES = 5 * 1024 * 1024;
export function exportRecord(record: SavedRecord): string {
  validateRecord(record);
  const json = JSON.stringify(record, null, 2);
  if (new TextEncoder().encode(json).length > MAX_RECORD_BYTES)
    throw new Error("Experiment files must be at most 5 MB.");
  return json;
}
export function importRecord(json: string): SavedRecord {
  if (
    json.length > MAX_RECORD_BYTES ||
    new TextEncoder().encode(json).length > MAX_RECORD_BYTES
  )
    throw new Error("Experiment files must be at most 5 MB.");
  const record: unknown = JSON.parse(json);
  validateRecord(record);
  return record;
}
export function measurementsCsv(
  source: RunResult | readonly Measurement[],
): string {
  const measurements = "measurements" in source ? source.measurements : source;
  return [
    "generation,density,activity,difference",
    ...measurements.map(
      (m) => `${m.generation},${m.density},${m.activity},${m.difference}`,
    ),
  ].join("\n");
}

export function compactResult(result: RunResult): BatchResult {
  return {
    config: result.config,
    initialGrid: result.initialGrid,
    summary: result.summary,
  };
}

export interface AggregateResult {
  rule: string;
  noiseProbability: number;
  density: number;
  width: number;
  height: number;
  boundary: Boundary;
  generations: number;
  count: number;
  densityMean: number;
  densitySd: number;
  activityMean: number;
  activitySd: number;
  differenceMean: number;
  differenceSd: number;
}
/** Replicate summaries; only combine runs with otherwise matched study conditions. */
export function aggregateResults(
  results: readonly BatchResult[],
): AggregateResult[] {
  const groups = new Map<string, BatchResult[]>();
  for (const result of results) {
    const c = result.config;
    const key = JSON.stringify([
      formatRule(parseRule(c.rule)),
      c.noiseProbability,
      c.density,
      c.width,
      c.height,
      c.boundary,
      c.generations,
    ]);
    const group = groups.get(key) ?? [];
    group.push(result);
    groups.set(key, group);
  }
  return Array.from(groups.values(), (group) => {
    const c = group[0].config;
    const moments = (key: "density" | "activity" | "difference") => {
      const values = group.map((result) => result.summary[key]);
      const mean =
        values.reduce((sum, value) => sum + value, 0) / values.length;
      const sd =
        values.length > 1
          ? Math.sqrt(
              values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
                (values.length - 1),
            )
          : 0;
      return { mean, sd };
    };
    const density = moments("density"),
      activity = moments("activity"),
      difference = moments("difference");
    return {
      rule: formatRule(parseRule(c.rule)),
      noiseProbability: c.noiseProbability,
      density: c.density,
      width: c.width,
      height: c.height,
      boundary: c.boundary,
      generations: c.generations,
      count: group.length,
      densityMean: density.mean,
      densitySd: density.sd,
      activityMean: activity.mean,
      activitySd: activity.sd,
      differenceMean: difference.mean,
      differenceSd: difference.sd,
    };
  });
}
