import "./style.css";
import {
  parseRule,
  formatRule,
  createRng,
  randomGrid,
  step,
  metrics,
  patternGrid,
  type Boundary,
} from "./engine";
import {
  surveyConfigs,
  noiseConfigs,
  createRecord,
  exportRecord,
  measurementsCsv,
  type ExperimentConfig,
  type BatchResult,
  importRecord,
  type SavedRecord,
  aggregateResults,
} from "./experiments";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.querySelector("#app")!.innerHTML = `
<header><a class="brand" href="#">◈ <span>EMERGENT</span></a><span class="subtitle">A laboratory for simple rules & complex worlds</span><span class="badge">CELLULAR AUTOMATA / 01</span></header>
<main><div class="intro"><div><p class="eyebrow">EXPLORE · OBSERVE · DISCOVER</p><h1>Small rules.<br><em>Unexpected worlds.</em></h1></div><p>Draw a beginning. Change a rule.<br>Watch what emerges, then find out why.</p></div>
<nav aria-label="Workspace"><button id="lab-tab" class="tab active">01 / Playground</button><button id="experiments-tab" class="tab">02 / Experiments</button><button id="notebook-tab" class="tab">03 / Notebook</button></nav>
<section id="lab" class="workspace"><aside class="panel"><div class="section-title">WORLD <span>01</span></div><label>Starting pattern<select id="pattern"><option value="random">Random field</option><option value="glider">Glider</option><option value="blinker">Blinker</option><option value="block">Block</option><option value="empty">Empty canvas</option></select></label><div class="two"><label>Grid size<select id="size"><option>64</option><option selected>128</option><option>256</option></select></label><label>Edges<select id="boundary"><option value="wrap">Wrap around</option><option value="dead">Fixed dead</option></select></label></div><label>Initial density <output id="density-out">30%</output><input id="density" type="range" min="0" max="100" value="30"></label><label>Random seed<input id="seed" type="number" min="0" max="4294967295" value="42"></label><button id="generate" class="wide">Generate world ↗</button>
<div class="section-title">RULE <span>02</span></div><div class="presets"><button id="conway">Conway</button><button id="highlife">HighLife</button></div><label>Birth / survival<input id="rule" value="B3/S23" spellcheck="false" aria-describedby="rule-help"></label><p id="rule-help" class="help">Choose the neighbor counts that bring a cell to life or keep it alive.</p><span class="row-label">BIRTH</span><div id="birth" class="counts"></div><span class="row-label">SURVIVAL</span><div id="survival" class="counts"></div>
<div class="section-title">PERTURBATION <span>03</span></div><label>Noise probability<input id="noise" type="number" min="0" max="1" step="0.0001" value="0"></label><p class="help">Each cell flips independently after every update. Zero preserves the original rule.</p><label>Noise seed<input id="noise-seed" type="number" min="0" max="4294967295" value="7"></label></aside>
<div class="stage"><div class="stage-heading"><span><i class="dot"></i> <span id="state">PAUSED</span></span><span id="world-label">128 × 128 · WRAP</span></div><div class="canvas-wrap"><canvas id="grid" width="768" height="768" aria-label="Cellular automaton grid. Drag to draw; shift-drag to erase."></canvas><canvas id="comparison" width="768" height="768" hidden aria-label="Matched noiseless simulation"></canvas></div><div class="canvas-caption"><span>DRAG TO DRAW · SHIFT TO ERASE</span><span id="comparison-label">B3/S23</span></div><div class="transport"><button id="play" class="primary">▶ Run</button><button id="step">Step →</button><button id="reset">↺ Restore</button><button id="clear">Clear</button><label class="speed">Speed <input id="speed" type="range" min="1" max="60" value="15"><output id="speed-out">15/s</output></label></div><div class="stats"><div><span>GENERATION</span><strong id="generation">0</strong></div><div><span>LIVE CELLS</span><strong id="population">0</strong></div><div><span>DENSITY</span><strong id="live-density">0%</strong></div><div><span>ACTIVITY</span><strong id="activity">0%</strong></div></div><details open><summary>Measurements over time <span class="help">density / activity</span></summary><canvas id="chart" width="900" height="140" aria-label="Density and activity chart"></canvas><p class="help">Green: density · amber: activity. These describe behavior, not complexity.</p></details><div class="savebar"><label><input id="paired" type="checkbox"> Compare with no noise</label><button id="screenshot">Save image</button><button id="csv">Export CSV</button></div><div class="record"><input id="name" placeholder="Name this discovery" aria-label="Discovery name"><textarea id="notes" placeholder="What did you observe? What would you test next?" aria-label="Observation notes"></textarea><button id="save" class="primary">＋ Save to notebook</button></div></div></section>
<section id="experiments" hidden><div class="experiment-intro"><h2>Look beyond a single world.</h2><p>Compare rules using matched starting grids. Runs happen in the background; you can cancel and keep completed results.</p></div><div class="batch-controls panel"><label>Protocol<select id="protocol"><option value="survey">100-rule survey · 900 runs</option><option value="noise">Noise study · 50 runs / rule</option><option value="pilot">Quick pilot · 9 runs</option></select></label><label>Grid<select id="batch-size"><option>64</option><option selected>128</option><option>256</option></select></label><label>Generations<input id="duration" type="number" min="1" max="10000" value="1000"></label><label>Sampling seed<input id="sampling-seed" type="number" value="2026" min="0" max="4294967295"></label><button id="start-batch" class="primary">Run experiments ↗</button><button id="cancel-batch" disabled>Cancel</button><button id="export-batch">Export results</button></div><p id="batch-info" class="help">Survey: 3 densities × 3 seeds per rule. Noise study uses the current playground rule and 10 matched seeds per noise level.</p><progress id="progress" max="1" value="0"></progress><p id="batch-status" role="status">Ready to investigate.</p><div id="aggregates"></div><div class="table-wrap"><table><thead><tr><th>Rule</th><th>Start density</th><th>Seed</th><th>Noise</th><th>Mean density</th><th>Mean activity</th><th>Observation</th><th>Replay</th></tr></thead><tbody id="results"></tbody></table></div><p class="help">Means use the final 500 generations (or the full run if shorter). Tags are your observations; a single run does not establish a rule’s behavior.</p></section>
<section id="notebook" hidden><div class="experiment-intro"><h2>Keep the interesting things.</h2><p>Saved beginnings, settings, and observations. Export a discovery to share a reproducible experiment.</p></div><label class="import">Import discovery <input id="import" type="file" accept=".json,application/json"></label><div id="records" class="records"></div></section><p id="message" role="status" aria-live="polite"></p></main><footer>EMERGENT / An open-ended study of order, noise & possibility.<span>Every discovery starts with a small change.</span></footer>`;
let width = 128,
  height = 128,
  grid = randomGrid(128, 128, 0.3, 42),
  initial = grid.slice(),
  baseline: Uint8Array = grid.slice(),
  generation = 0,
  playing = false,
  rule = parseRule("B3/S23"),
  boundary: Boundary = "wrap",
  noise = 0,
  rng = createRng(7),
  history: {
    generation: number;
    density: number;
    activity: number;
    difference: number;
  }[] = [],
  worker: Worker | undefined,
  results: BatchResult[] = [],
  batchMetadata: Record<string, unknown> = {};
const canvas = $<HTMLCanvasElement>("grid");
const comparison = $<HTMLCanvasElement>("comparison");
const num = (id: string) => Number($<HTMLInputElement>(id).value);
function validSeed(id: string) {
  const n = num(id);
  if (!Number.isInteger(n) || n < 0 || n > 4294967295) {
    say("Seeds must be integers from 0 to 4294967295.");
    return false;
  }
  return true;
}
const say = (message: string) => {
  $("message").textContent = message;
};
function pause() {
  playing = false;
  $("play").textContent = "▶ Run";
  $("state").textContent = "PAUSED";
}
function config(): ExperimentConfig {
  return {
    rule: formatRule(rule),
    width,
    height,
    boundary,
    density: num("density") / 100,
    initialSeed:
      Number.isInteger(num("seed")) &&
      num("seed") >= 0 &&
      num("seed") <= 4294967295
        ? num("seed")
        : 42,
    noiseSeed: num("noise-seed"),
    noiseProbability: noise,
    generations: generation,
  };
}
function fresh() {
  if (!validSeed("noise-seed")) $<HTMLInputElement>("noise-seed").value = "7";
  pause();
  initial = grid.slice();
  baseline = grid.slice();
  generation = 0;
  rng = createRng(num("noise-seed"));
  history = [];
  render();
}
function paint(target: HTMLCanvasElement, cells: Uint8Array) {
  const c = target.getContext("2d")!;
  c.fillStyle = "#102a24";
  c.fillRect(0, 0, target.width, target.height);
  c.fillStyle = "#bce8a0";
  const size = target.width / width;
  for (let i = 0; i < cells.length; i++)
    if (cells[i])
      c.fillRect(
        (i % width) * size,
        (Math.floor(i / width) * target.height) / height,
        Math.max(1, size - 0.65),
        Math.max(1, target.height / height - 0.65),
      );
}
function render() {
  paint(canvas, grid);
  if ($<HTMLInputElement>("paired").checked) paint(comparison, baseline);
  const live = grid.reduce((a, b) => a + b, 0);
  $("generation").textContent = generation.toLocaleString();
  $("population").textContent = live.toLocaleString();
  $("live-density").textContent = ((100 * live) / grid.length).toFixed(1) + "%";
  $("activity").textContent =
    ((history.at(-1)?.activity ?? 0) * 100).toFixed(1) + "%";
  $("world-label").textContent =
    `${width} × ${height} · ${boundary.toUpperCase()}`;
  $("comparison-label").textContent =
    formatRule(rule) +
    ($<HTMLInputElement>("paired").checked
      ? ` · NOISE / CONTROL · DIFFERENCE ${((100 * grid.reduce((n, v, i) => n + Number(v !== baseline[i]), 0)) / grid.length).toFixed(1)}%`
      : "");
  drawChart();
}
function drawChart() {
  const c = $<HTMLCanvasElement>("chart"),
    x = c.getContext("2d")!;
  x.clearRect(0, 0, c.width, c.height);
  x.strokeStyle = "#dfe5dc";
  for (let y = 0; y < 140; y += 35) {
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(900, y);
    x.stroke();
  }
  const data = history.slice(-900);
  for (const [key, color] of [
    ["density", "#477354"],
    ["activity", "#b58032"],
  ] as const) {
    x.strokeStyle = color;
    x.lineWidth = 2;
    x.beginPath();
    data.forEach((d, i) => {
      const px = (i / Math.max(1, data.length - 1)) * 900,
        py = 138 - d[key] * 136;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    });
    x.stroke();
  }
}
function advance() {
  const next = step(grid, width, height, rule, boundary, noise, rng);
  const m = metrics(grid, next);
  grid = next;
  baseline = step(baseline, width, height, rule, boundary);
  generation++;
  history.push({
    generation,
    ...m,
    difference:
      grid.reduce((n, v, i) => n + Number(v !== baseline[i]), 0) / grid.length,
  });
  if (history.length > 10000) history.shift();
  render();
}
function toggles() {
  for (const key of ["birth", "survival"] as const) {
    $(key).replaceChildren();
    for (let n = 0; n <= 8; n++) {
      const b = document.createElement("button");
      b.textContent = String(n);
      b.setAttribute("aria-label", `${key} with ${n} neighbors`);
      b.setAttribute("aria-pressed", String(rule[key].includes(n)));
      b.onclick = () => {
        rule[key] = rule[key].includes(n)
          ? rule[key].filter((v) => v !== n)
          : [...rule[key], n].sort();
        $<HTMLInputElement>("rule").value = formatRule(rule);
        toggles();
        fresh();
      };
      $(key).append(b);
    }
  }
}
function setRule(text: string) {
  try {
    rule = parseRule(text);
    $<HTMLInputElement>("rule").value = formatRule(rule);
    toggles();
    fresh();
    say("Rule updated. A new experiment begins from the current grid.");
  } catch (e) {
    say(String(e));
    $<HTMLInputElement>("rule").value = formatRule(rule);
  }
}
$("rule").onchange = () => setRule($<HTMLInputElement>("rule").value);
$("conway").onclick = () => setRule("B3/S23");
$("highlife").onclick = () => setRule("B36/S23");
$("generate").onclick = () => {
  if (!validSeed("seed")) return;
  width = height = num("size");
  const p = $<HTMLSelectElement>("pattern").value;
  grid =
    p === "random"
      ? randomGrid(width, height, num("density") / 100, num("seed"))
      : p === "empty"
        ? new Uint8Array(width * height)
        : patternGrid(p as "block" | "blinker" | "glider", width, height);
  fresh();
};
$("density").oninput = () => {
  $("density-out").textContent = num("density") + "%";
};
$("speed").oninput = () => {
  $("speed-out").textContent = num("speed") + "/s";
};
$("boundary").onchange = () => {
  boundary = $<HTMLSelectElement>("boundary").value as Boundary;
  fresh();
};
$("noise").onchange = () => {
  const p = num("noise");
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    $<HTMLInputElement>("noise").value = String(noise);
    say("Noise must be between 0 and 1.");
    return;
  }
  noise = p;
  fresh();
};
$("noise-seed").onchange = () => fresh();
$("play").onclick = () => {
  playing = !playing;
  $("play").textContent = playing ? "Ⅱ Pause" : "▶ Run";
  $("state").textContent = playing ? "RUNNING" : "PAUSED";
};
$("step").onclick = () => {
  pause();
  advance();
};
$("reset").onclick = () => {
  grid = initial.slice();
  fresh();
};
$("clear").onclick = () => {
  grid = new Uint8Array(width * height);
  fresh();
};
$("paired").onchange = () => {
  comparison.hidden = !$<HTMLInputElement>("paired").checked;
  grid = initial.slice();
  fresh();
};
let drawing = false,
  erase = false;
function draw(e: PointerEvent) {
  const r = canvas.getBoundingClientRect(),
    x = Math.floor(((e.clientX - r.left) / r.width) * width),
    y = Math.floor(((e.clientY - r.top) / r.height) * height);
  if (x >= 0 && x < width && y >= 0 && y < height) {
    grid[y * width + x] = erase ? 0 : 1;
    initial = grid.slice();
    baseline = grid.slice();
    render();
  }
}
canvas.onpointerdown = (e) => {
  fresh();
  drawing = true;
  erase = e.shiftKey || e.button === 2;
  canvas.setPointerCapture(e.pointerId);
  draw(e);
};
canvas.onpointermove = (e) => {
  if (drawing) draw(e);
};
canvas.onpointerup = () => {
  drawing = false;
};
canvas.onpointercancel = () => {
  drawing = false;
};
canvas.oncontextmenu = (e) => e.preventDefault();
let last = 0;
function frame(time: number) {
  if (playing && time - last >= 1000 / num("speed")) {
    advance();
    last = time;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
for (const name of ["lab", "experiments", "notebook"])
  $(name + "-tab").onclick = () => {
    for (const n of ["lab", "experiments", "notebook"]) {
      $(n).hidden = n !== name;
      $(n + "-tab").classList.toggle("active", n === name);
    }
    if (name !== "lab") pause();
  };
function download(name: string, data: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("csv").onclick = () =>
  download("measurements.csv", measurementsCsv(history), "text/csv");
$("screenshot").onclick = () => {
  const a = document.createElement("a");
  a.download = `${formatRule(rule).replace("/", "-")}-${generation}.png`;
  a.href = canvas.toDataURL();
  a.click();
};
let records: SavedRecord[] = [];
try {
  records = JSON.parse(localStorage.getItem("emergent-notebook") ?? "[]");
  if (!Array.isArray(records)) records = [];
  records = records.map((r) => importRecord(JSON.stringify(r)));
} catch {
  records = [];
  say(
    "Notebook storage could not be read. Export discoveries to keep a backup.",
  );
}
function persist() {
  try {
    localStorage.setItem("emergent-notebook", JSON.stringify(records));
    return true;
  } catch {
    say(
      "Browser storage is full or unavailable. Export this discovery to keep it.",
    );
    return false;
  }
}
function loadRecord(r: SavedRecord) {
  const c = r.config;
  pause();
  if (
    ![...$<HTMLSelectElement>("size").options].some(
      (o) => o.value === String(c.width),
    )
  ) {
    const o = document.createElement("option");
    o.value = String(c.width);
    o.textContent = `${c.width} × ${c.height}`;
    $("size").append(o);
  }
  width = c.width;
  height = c.height;
  grid = Uint8Array.from(r.initialGrid);
  rule = parseRule(c.rule);
  boundary = c.boundary;
  noise = c.noiseProbability;
  for (const [id, value] of Object.entries({
    size: width,
    rule: c.rule,
    boundary,
    noise,
    seed: c.initialSeed,
    "noise-seed": c.noiseSeed,
    density: c.density * 100,
  }))
    $<HTMLInputElement>(id).value = String(value);
  $("density-out").textContent = c.density * 100 + "%";
  $<HTMLInputElement>("name").value = r.name;
  $<HTMLTextAreaElement>("notes").value = r.notes;
  toggles();
  fresh();
  $("lab-tab").click();
  say(
    `Loaded “${r.name}” at generation 0. Original observation: generation ${r.generation}.`,
  );
}
function showRecords() {
  $("records").replaceChildren();
  if (!records.length) {
    $("records").textContent =
      "Your notebook is empty. Save a discovery from the playground.";
    return;
  }
  records.forEach((r, i) => {
    const card = document.createElement("article");
    card.className = "record-card";
    const h = document.createElement("h3");
    h.textContent = r.name;
    const p = document.createElement("p");
    p.textContent = r.notes;
    const meta = document.createElement("small");
    meta.textContent = `${r.config.rule} · ${r.config.width} × ${r.config.height} · noise ${r.config.noiseProbability} · generation ${r.generation}`;
    card.append(h, meta, p);
    if (r.screenshot) {
      const img = document.createElement("img");
      img.src = r.screenshot;
      img.alt = "Saved simulation";
      card.prepend(img);
    }
    for (const [label, action] of [
      ["Replay", () => loadRecord(r)],
      ["Export", () => download("discovery.json", exportRecord(r))],
      [
        "Delete",
        () => {
          records.splice(i, 1);
          persist();
          showRecords();
        },
      ],
    ] as const) {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = action;
      card.append(b);
    }
    $("records").append(card);
  });
}
$("save").onclick = () => {
  try {
    const name =
      $<HTMLInputElement>("name").value.trim() ||
      `${formatRule(rule)} / generation ${generation}`;
    const record = createRecord(
      config(),
      Array.from(initial),
      name,
      $<HTMLTextAreaElement>("notes").value,
      generation,
      canvas.toDataURL(),
    );
    records.unshift(record);
    if (persist()) say("Discovery saved. Find it in your notebook.");
    showRecords();
  } catch (error) {
    say(String(error));
  }
};
$("import").onchange = async () => {
  const f = $<HTMLInputElement>("import").files?.[0];
  if (!f) return;
  try {
    if (f.size > 5_000_000) throw Error("File exceeds 5 MB.");
    const r = importRecord(await f.text());
    records.unshift(r);
    showRecords();
    if (persist()) say("Discovery imported.");
  } catch (e) {
    say(String(e));
  }
  $<HTMLInputElement>("import").value = "";
};
function addResult(result: BatchResult) {
  results.push(result);
  const tr = document.createElement("tr");
  const c = result.config;
  for (const v of [
    c.rule,
    `${c.density * 100}%`,
    c.initialSeed,
    c.noiseProbability,
    `${(result.summary.density * 100).toFixed(1)}%`,
    `${(result.summary.activity * 100).toFixed(1)}%`,
  ]) {
    const td = document.createElement("td");
    td.textContent = String(v);
    tr.append(td);
  }
  const td = document.createElement("td"),
    input = document.createElement("input");
  input.placeholder = "Add a tag";
  input.setAttribute("aria-label", "Observation tag");
  input.onchange = () => {
    result.tag = input.value;
  };
  td.append(input);
  tr.append(td);
  const replay = document.createElement("td"),
    button = document.createElement("button");
  button.textContent = "Open ↗";
  button.onclick = () =>
    loadRecord({
      version: 1,
      engineVersion: "1.0.0",
      name: `${c.rule} / seed ${c.initialSeed}`,
      notes: input.value,
      config: c,
      initialGrid: result.initialGrid,
      generation: c.generations,
    });
  replay.append(button);
  tr.append(replay);
  $("results").append(tr);
}
function stopBatch() {
  worker?.terminate();
  worker = undefined;
  $<HTMLButtonElement>("start-batch").disabled = false;
  $<HTMLButtonElement>("cancel-batch").disabled = true;
}
$("protocol").onchange = () => {
  $<HTMLInputElement>("duration").value =
    $<HTMLSelectElement>("protocol").value === "noise"
      ? "2000"
      : $<HTMLSelectElement>("protocol").value === "pilot"
        ? "100"
        : "1000";
};
$("start-batch").onclick = () => {
  const size = num("batch-size"),
    generations = num("duration"),
    seed = num("sampling-seed");
  if (
    !Number.isInteger(generations) ||
    generations < 1 ||
    generations > 10000 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 4294967295
  ) {
    say("Use 1–10,000 generations and an unsigned 32-bit seed.");
    return;
  }
  const protocol = $<HTMLSelectElement>("protocol").value;
  let configs =
    protocol === "noise"
      ? noiseConfigs(formatRule(rule), size, size, generations)
      : surveyConfigs({
          width: size,
          height: size,
          generations,
          samplingSeed: seed,
        });
  if (protocol === "pilot") configs = configs.slice(0, 9);
  batchMetadata = {
    protocol,
    samplingSeed: protocol === "noise" ? null : seed,
    createdAt: new Date().toISOString(),
  };
  results = [];
  $("results").replaceChildren();
  $("aggregates").replaceChildren();
  $<HTMLProgressElement>("progress").value = 0;
  $<HTMLProgressElement>("progress").max = configs.length;
  $<HTMLButtonElement>("start-batch").disabled = true;
  $<HTMLButtonElement>("cancel-batch").disabled = false;
  $("batch-status").textContent = `Running 0 / ${configs.length}…`;
  worker = new Worker(new URL("./batch.worker.ts", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (e) => {
    const d = e.data;
    if (d.type === "result") {
      addResult(d.result);
      $<HTMLProgressElement>("progress").value = results.length;
      $("batch-status").textContent =
        `Completed ${results.length} / ${configs.length}`;
    } else if (d.type === "done") {
      showAggregates();
      stopBatch();
      $("batch-status").textContent =
        `Finished ${results.length} runs. Export results to preserve them.`;
    } else if (d.type === "error") {
      stopBatch();
      say(d.message);
    }
  };
  worker.onerror = (e) => {
    stopBatch();
    say(`Experiment failed: ${e.message}`);
  };
  worker.postMessage({ type: "start", configs });
};
$("cancel-batch").onclick = () => {
  stopBatch();
  $("batch-status").textContent =
    `Cancelled. ${results.length} completed runs retained.`;
};
$("export-batch").onclick = () => {
  if (!results.length) {
    say("Run an experiment before exporting.");
    return;
  }
  download(
    "experiment-results.json",
    JSON.stringify({
      version: 1,
      engineVersion: "1.0.0",
      ...batchMetadata,
      aggregates: aggregateResults(results),
      results,
    }),
  );
};
toggles();
render();
showRecords();

function showAggregates() {
  const groups = aggregateResults(results);
  const root = $("aggregates");
  root.replaceChildren();
  const details = document.createElement("details");
  details.open = true;
  const heading = document.createElement("summary");
  heading.textContent = "Replicate summaries · mean ± sample SD";
  details.append(heading);
  const table = document.createElement("table");
  const head = document.createElement("tr");
  for (const label of [
    "Rule / noise / initial density",
    "Trials",
    "Density",
    "Activity",
    "Difference from control",
  ]) {
    const th = document.createElement("th");
    th.textContent = label;
    head.append(th);
  }
  table.append(head);
  for (const g of groups) {
    const row = document.createElement("tr");
    for (const text of [
      g.rule + " / " + g.noiseProbability + " / " + g.density * 100 + "%",
      String(g.count),
      percent(g.densityMean, g.densitySd),
      percent(g.activityMean, g.activitySd),
      percent(g.differenceMean, g.differenceSd),
    ]) {
      const td = document.createElement("td");
      td.textContent = text;
      row.append(td);
    }
    table.append(row);
  }
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  wrap.append(table);
  details.append(wrap);
  root.append(details);
  if (
    groups.length > 1 &&
    groups.every(
      (g) => g.rule === groups[0].rule && g.density === groups[0].density,
    )
  ) {
    const c = document.createElement("canvas");
    c.width = 900;
    c.height = 230;
    c.style.width = "100%";
    c.setAttribute(
      "aria-label",
      "Noise response: mean density and activity with sample standard deviation",
    );
    const x = c.getContext("2d")!;
    x.font = "12px system-ui";
    const sorted = [...groups].sort(
      (a, b) => a.noiseProbability - b.noiseProbability,
    );
    for (const [metric, color] of [
      ["density", "#477354"],
      ["activity", "#b58032"],
    ] as const) {
      x.strokeStyle = color;
      x.fillStyle = color;
      x.beginPath();
      sorted.forEach((g, i) => {
        const px = 50 + (i * 800) / Math.max(1, sorted.length - 1),
          py = 195 - 170 * g[(metric + "Mean") as "densityMean"];
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      });
      x.stroke();
      sorted.forEach((g, i) => {
        const px = 50 + (i * 800) / Math.max(1, sorted.length - 1),
          mean = g[(metric + "Mean") as "densityMean"],
          sd = g[(metric + "Sd") as "densitySd"];
        x.beginPath();
        x.moveTo(px, 195 - 170 * Math.max(0, mean - sd));
        x.lineTo(px, 195 - 170 * Math.min(1, mean + sd));
        x.stroke();
        x.beginPath();
        x.arc(px, 195 - 170 * mean, 3, 0, Math.PI * 2);
        x.fill();
      });
    }
    x.fillStyle = "#526149";
    sorted.forEach((g, i) =>
      x.fillText(
        "p=" + g.noiseProbability,
        30 + (i * 800) / Math.max(1, sorted.length - 1),
        218,
      ),
    );
    x.fillText(
      "Density (green) · activity (amber) · bars: sample SD · y: 0–100%",
      30,
      16,
    );
    details.prepend(c);
  }
}
function percent(mean: number, sd: number) {
  return `${(mean * 100).toFixed(2)}% ± ${(sd * 100).toFixed(2)}%`;
}
