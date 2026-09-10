import { readFile, writeFile, mkdir } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { createHash } from "node:crypto";
import { join } from "node:path";

// A small follow-up, using the application engine without a separate simulator.
const root = join(import.meta.dirname, "..");
const source = await readFile(join(root, "src/engine.ts"), "utf8");
const moduleUrl =
  "data:text/javascript;base64," +
  Buffer.from(stripTypeScriptTypes(source)).toString("base64");
const { randomGrid, parseRule, step, metrics } = await import(moduleUrl);
const ruleName = "B368/S1348";
const rule = parseRule(ruleName);
const output = join(root, "docs/results");
await mkdir(output, { recursive: true });

function extent(grid, size) {
  let left = size,
    right = -1,
    top = size,
    bottom = -1;
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) continue;
    const x = i % size,
      y = Math.floor(i / size);
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return right < 0
    ? null
    : {
        left,
        right,
        top,
        bottom,
        width: right - left + 1,
        height: bottom - top + 1,
      };
}

function run(initial, size, generations, boundary, name, snapshotAt = -1) {
  let grid = initial.slice(),
    snapshot;
  const measurements = [];
  let firstBoundaryContact = null;
  for (let generation = 0; generation <= generations; generation++) {
    const before = grid;
    if (generation) grid = step(grid, size, size, rule, boundary);
    const m = metrics(before, grid);
    // A contact at an unrecorded generation can also matter; check all four edges.
    if (firstBoundaryContact === null) {
      for (let i = 0; i < size; i++) {
        if (
          grid[i] ||
          grid[(size - 1) * size + i] ||
          grid[i * size] ||
          grid[i * size + size - 1]
        ) {
          firstBoundaryContact = generation;
          break;
        }
      }
    }
    if (generation === snapshotAt) snapshot = grid.slice();
    if (generation % 10 === 0)
      measurements.push({
        generation,
        population: Math.round(m.density * grid.length),
        ...m,
        extent: extent(grid, size),
      });
    if (generation && generation % 500 === 0)
      console.log(`${name}: ${generation}/${generations}`);
  }
  return {
    result: {
      name,
      size,
      boundary,
      generations,
      firstBoundaryContact,
      measurements,
    },
    snapshot,
    grid,
  };
}

const initial = randomGrid(128, 128, 0.1, 1);
const original = run(initial, 128, 3000, "wrap", "original", 1000);
const snapshot = original.snapshot;
const runs = [original.result];
for (const size of [256, 512, 1024]) {
  const padded = new Uint8Array(size * size);
  const offset = (size - 128) / 2;
  for (let y = 0; y < 128; y++)
    padded.set(
      snapshot.subarray(y * 128, (y + 1) * 128),
      (offset + y) * size + offset,
    );
  const { result } = run(padded, size, 1000, "dead", `padded-${size}`);
  runs.push(result);
}

const record = {
  engineVersion: "1.0.0",
  engineSourceHash: createHash("sha256").update(source).digest("hex"),
  generatedAt: new Date().toISOString(),
  rule: ruleName,
  initialDensity: 0.1,
  initialSeed: 1,
  noiseProbability: 0,
  method:
    "Continue original 128² torus to generation 3000. Center its complete generation-1000 state, without cropping, into empty fixed-dead 256², 512² and 1024² domains for 1000 additional steps. Measurements every 10 steps; boundary contact checked every step. Extent is the bounding box of all live cells, not an identified individual object.",
  runs,
};
await writeFile(
  join(output, "blob-study.json"),
  JSON.stringify(record, null, 2) + "\n",
);
await writeFile(
  join(output, "blob-snapshot.json"),
  JSON.stringify(
    {
      version: 1,
      engineVersion: "1.0.0",
      name: "B368/S1348 · generation 1000 snapshot",
      notes:
        "Complete 128² state after 1000 steps from density 0.1 / seed 1. Replay starts at this snapshot; use Expand into empty space to repeat the padding experiment.",
      generation: 0,
      initialGrid: Array.from(snapshot),
      config: {
        rule: ruleName,
        width: 128,
        height: 128,
        boundary: "wrap",
        density: 0.1,
        initialSeed: 1,
        noiseSeed: 1001,
        noiseProbability: 0,
        generations: 0,
      },
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    runs.map((r) => ({
      name: r.name,
      firstBoundaryContact: r.firstBoundaryContact,
      initial: r.measurements[0],
      final: r.measurements.at(-1),
    })),
    null,
    2,
  ),
);
