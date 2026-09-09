import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { tmpdir, cpus } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

// Node >=22.13: execute the app's engine, rather than a separate research implementation.
const root = resolve(import.meta.dirname, "..");
const out = join(root, "docs/results");
const temp = await mkdtemp(join(tmpdir(), "emergent-research-"));
const engine = await readFile(join(root, "src/engine.ts"), "utf8");
const experiments = await readFile(join(root, "src/experiments.ts"), "utf8");
const sourceHash = createHash("sha256")
  .update(engine + experiments)
  .digest("hex");
await mkdir(out, { recursive: true });
try {
  await writeFile(join(temp, "engine.mjs"), stripTypeScriptTypes(engine));
  const runnableExperiments = stripTypeScriptTypes(experiments).replace(
    /(["'])\.\/engine\1/,
    '"./engine.mjs"',
  );
  await writeFile(join(temp, "experiments.mjs"), runnableExperiments);
  const { runExperiment, surveyConfigs, noiseConfigs, aggregateResults } =
    await import(pathToFileURL(join(temp, "experiments.mjs")).href);
  const started = Date.now();
  const metadata = {
    engineVersion: "1.0.0",
    sourceHash,
    generatedAt: new Date().toISOString(),
    node: process.version,
    cpu: cpus()[0]?.model,
    summaryWindow: 500,
  };
  async function execute(name, configs, extra = {}) {
    const results = [];
    const studyStarted = Date.now();
    for (const config of configs) {
      const run = runExperiment(config);
      results.push({
        config: run.config,
        summary: run.summary,
        finalMeasurement: run.measurements.at(-1),
      });
      if (results.length % 10 === 0 || results.length === configs.length)
        console.log(
          `${name}: ${results.length}/${configs.length} (${((Date.now() - studyStarted) / 1000).toFixed(1)}s)`,
        );
    }
    const record = {
      ...metadata,
      ...extra,
      runCount: results.length,
      elapsedSeconds: (Date.now() - studyStarted) / 1000,
      results,
      aggregates: aggregateResults(results),
    };
    await writeFile(
      join(out, `${name}.json`),
      JSON.stringify(record, null, 2) + "\n",
    );
    return record;
  }
  const survey = await execute(
    "survey",
    surveyConfigs({
      width: 128,
      height: 128,
      generations: 1000,
      samplingSeed: 2026,
    }),
    { samplingSeed: 2026 },
  );
  // Prefer intermediate persistent activity with variation across initial densities/seeds.
  const candidates = [...new Set(survey.results.map((r) => r.config.rule))]
    .map((rule) => {
      const runs = survey.results.filter((r) => r.config.rule === rule);
      const mean =
        runs.reduce((a, r) => a + r.summary.activity, 0) / runs.length;
      const variance =
        runs.reduce((a, r) => a + (r.summary.activity - mean) ** 2, 0) /
        runs.length;
      return { rule, meanActivity: mean, activityVariance: variance };
    })
    .filter((r) => r.meanActivity > 0.02 && r.meanActivity < 0.8)
    .sort((a, b) => b.activityVariance - a.activityVariance);
  const selected = candidates[0];
  if (!selected)
    throw new Error(
      "No surveyed rule meets the predeclared selection criterion.",
    );
  console.log("Selected", JSON.stringify(selected));
  const noise = await execute(
    "noise",
    ["B3/S23", "B36/S23", selected.rule].flatMap((rule) => noiseConfigs(rule)),
    {
      selected,
      selectionCriterion:
        "Largest across-run activity variance among sampled rules with mean final-500 activity strictly between 0.02 and 0.8.",
    },
  );
  const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  const colors = ["#1d4ed8", "#c2410c", "#15803d"];
  const rules = ["B3/S23", "B36/S23", selected.rule];
  const ps = [0, 0.0001, 0.001, 0.01, 0.05];
  let svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="460" viewBox="0 0 1050 460"><rect width="1050" height="460" fill="white"/><g font-family="sans-serif" fill="#172033"><text x="35" y="28" font-size="19">Persistent noise: final 500 generations, mean ± sample SD (10 seeds)</text>';
  ["density", "activity", "difference"].forEach((metric, panel) => {
    const x0 = 55 + panel * 340,
      y0 = 335,
      w = 270,
      h = 250;
    svg += `<text x="${x0}" y="60" font-size="16">${metric === "difference" ? "Difference from noiseless" : metric}</text>`;
    for (let t = 0; t <= 1; t += 0.25)
      svg += `<path d="M${x0} ${y0 - t * h}h${w}" stroke="#ddd"/><text x="${x0 - 30}" y="${y0 - t * h + 4}" font-size="11">${t.toFixed(2)}</text>`;
    ps.forEach((p, i) => {
      svg += `<text x="${x0 + (i * w) / 4}" y="${y0 + 22}" text-anchor="middle" font-size="11">${p}</text>`;
    });
    svg += `<text x="${x0 + w / 2}" y="${y0 + 46}" text-anchor="middle" font-size="12">Flip probability (categorical spacing)</text>`;
    rules.forEach((rule, r) => {
      const groups = ps.map((p) =>
        noise.aggregates.find(
          (a) => a.rule === rule && a.noiseProbability === p,
        ),
      );
      svg += `<polyline fill="none" stroke="${colors[r]}" stroke-width="2" points="${groups.map((g, i) => `${x0 + (i * w) / 4},${y0 - g[metric + "Mean"] * h}`).join(" ")}"/>`;
      groups.forEach((g, i) => {
        const x = x0 + (i * w) / 4,
          mean = g[metric + "Mean"],
          sd = g[metric + "Sd"];
        const top = y0 - Math.min(1, mean + sd) * h,
          bottom = y0 - Math.max(0, mean - sd) * h;
        svg += `<path d="M${x} ${top}V${bottom}M${x - 3} ${top}h6M${x - 3} ${bottom}h6" stroke="${colors[r]}"/><circle cx="${x}" cy="${y0 - mean * h}" r="3" fill="${colors[r]}"/>`;
      });
    });
  });
  rules.forEach((rule, i) => {
    svg += `<text x="${55 + i * 320}" y="430" font-size="14" fill="${colors[i]}">${esc(rule)}</text>`;
  });
  svg += "</g></svg>\n";
  await writeFile(join(out, "noise.svg"), svg);
  console.log(
    `Completed in ${((Date.now() - started) / 1000).toFixed(1)}s. Results: ${out}`,
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
