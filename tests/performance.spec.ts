import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { runExperiment } from "../src/experiments";

test("accelerated playback preserves every noisy generation", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#size").selectOption("64");
  await page.locator("#generate").click();
  await page.locator("#noise").fill("0.01");
  await page.locator("#noise").press("Tab");
  await page.locator("#speed").fill("1000");
  await page.locator("#play").click();
  await expect
    .poll(async () =>
      Number(
        (await page.locator("#generation").innerText()).replaceAll(",", ""),
      ),
    )
    .toBeGreaterThan(100);
  await page.locator("#play").click();
  const csvDownload = page.waitForEvent("download");
  await page.locator("#csv").click();
  const csv = await readFile((await (await csvDownload).path())!, "utf8");
  const rows = csv
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(",").map(Number));
  const expected = runExperiment({
    rule: "B3/S23",
    width: 64,
    height: 64,
    boundary: "wrap",
    density: 0.3,
    initialSeed: 42,
    noiseSeed: 7,
    noiseProbability: 0.01,
    generations: rows.length,
  });
  expect(rows).toEqual(
    expected.measurements.map((m) => [
      m.generation,
      m.density,
      m.activity,
      m.difference,
    ]),
  );
  await page.locator("#step").click();
  await expect(page.locator("#generation")).toHaveText(
    (rows.length + 1).toLocaleString(),
  );
});

test("parallel experiments reproduce serial results in configuration order", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "hardwareConcurrency", { value: 8 }),
  );
  await page.goto("/");
  await page.locator("#experiments-tab").click();
  await page.locator("#protocol").selectOption("noise");
  await page.locator("#batch-size").selectOption("64");
  await page.locator("#duration").fill("10");
  const runs = [];
  for (const count of ["1", "4"]) {
    await page.locator("#concurrency").selectOption(count);
    await page.locator("#start-batch").click();
    await expect(page.locator("#batch-status")).toContainText(
      "Finished 50 runs",
    );
    const download = page.waitForEvent("download");
    await page.locator("#export-batch").click();
    runs.push(
      JSON.parse(await readFile((await (await download).path())!, "utf8")),
    );
  }
  expect(runs[1].results).toEqual(runs[0].results);
  expect(runs[1].aggregates).toEqual(runs[0].aggregates);
});

test("expanding a world preserves cells and centers the state in empty space", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#size").selectOption("256");
  await page.locator("#pattern").selectOption("glider");
  await page.locator("#generate").click();
  for (const size of [512, 1024]) {
    await page.locator("#expand").click();
    await expect(page.locator("#world-label")).toContainText(
      `${size} × ${size}`,
    );
    await expect(page.locator("#population")).toHaveText("5");
    await expect(page.locator("#generation")).toHaveText("0");
    await page.locator("#step").click();
    await expect(page.locator("#population")).toHaveText("5");
  }
  await page.locator("#expand").click();
  await expect(page.locator("#message")).toContainText("limited to 1024");
});
