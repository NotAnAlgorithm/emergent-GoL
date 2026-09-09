import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function makeBlinker(page: Page) {
  await page.locator("#size").selectOption("64");
  await page.locator("#pattern").selectOption("blinker");
  await page.locator("#generate").click();
  await expect(page.locator("#population")).toHaveText("3");
}

async function preparePilot(page: Page) {
  await page.locator("#experiments-tab").click();
  await page.locator("#protocol").selectOption("pilot");
  await page.locator("#batch-size").selectOption("64");
  await page.locator("#duration").fill("2");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("transport, rule controls, and drawing start reproducible experiments", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await makeBlinker(page);
  await page.locator("#step").click();
  await expect(page.locator("#generation")).toHaveText("1");
  await expect(page.locator("#population")).toHaveText("3");
  await page.locator("#reset").click();
  await expect(page.locator("#generation")).toHaveText("0");
  await page.locator("#play").click();
  await expect(page.locator("#state")).toHaveText("RUNNING");
  await expect(page.locator("#generation")).not.toHaveText("0");
  await page.locator("#play").click();
  await expect(page.locator("#state")).toHaveText("PAUSED");
  await page.locator("#highlife").click();
  await expect(page.locator("#rule")).toHaveValue("B36/S23");
  await expect(
    page.getByRole("button", { name: "birth with 6 neighbors", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "birth with 6 neighbors", exact: true })
    .click();
  await expect(page.locator("#rule")).toHaveValue("B3/S23");
  await page.locator("#rule").fill("B9/S23");
  await page.locator("#rule").press("Tab");
  await expect(page.locator("#message")).toContainText("notation");
  await expect(page.locator("#rule")).toHaveValue("B3/S23");
  await page.locator("#clear").click();
  await expect(page.locator("#population")).toHaveText("0");
  await page.locator("#grid").click({ position: { x: 30, y: 30 } });
  await expect(page.locator("#population")).toHaveText("1");
  await page
    .locator("#grid")
    .click({ position: { x: 30, y: 30 }, modifiers: ["Shift"] });
  await expect(page.locator("#population")).toHaveText("0");
  expect(errors).toEqual([]);
});

test("notebook saves, persists, exports, imports, and replays exact beginnings", async ({
  page,
}) => {
  await makeBlinker(page);
  await page.locator("#step").click();
  await page.locator("#name").fill("Period two");
  await page.locator("#notes").fill("Returns after two generations.");
  await page.locator("#save").click();
  await expect(page.locator("#message")).toContainText("Discovery saved");
  await page.reload();
  await page.locator("#notebook-tab").click();
  await expect(page.locator(".record-card")).toHaveCount(1);
  await expect(page.locator(".record-card")).toContainText("Period two");
  const downloading = page.waitForEvent("download");
  await page
    .locator(".record-card")
    .getByRole("button", { name: "Export", exact: true })
    .click();
  const download = await downloading;
  const contents = await readFile((await download.path())!);
  const record = JSON.parse(contents.toString());
  expect(record.initialGrid.filter((cell: number) => cell === 1)).toHaveLength(
    3,
  );
  expect(record.generation).toBe(1);
  expect(record.config.width).toBe(64);
  await page
    .locator(".record-card")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.locator(".record-card")).toHaveCount(0);
  await page.locator("#import").setInputFiles({
    name: "discovery.json",
    mimeType: "application/json",
    buffer: contents,
  });
  await expect(page.locator("#message")).toHaveText("Discovery imported.");
  await expect(page.locator(".record-card")).toHaveCount(1);
  await page
    .locator(".record-card")
    .getByRole("button", { name: "Replay", exact: true })
    .click();
  await expect(page.locator("#lab")).toBeVisible();
  await expect(page.locator("#generation")).toHaveText("0");
  await expect(page.locator("#population")).toHaveText("3");
  await expect(page.locator("#name")).toHaveValue("Period two");
  await expect(page.locator("#notes")).toHaveValue(
    "Returns after two generations.",
  );
  await page.locator("#step").click();
  await expect(page.locator("#population")).toHaveText("3");
});

test("malformed discovery files are rejected without adding records", async ({
  page,
}) => {
  await page.locator("#notebook-tab").click();
  for (const contents of ['{"version":1}', "{broken json"]) {
    await page.locator("#import").setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(contents),
    });
    await expect(page.locator("#message")).not.toHaveText("");
    await expect(page.locator(".record-card")).toHaveCount(0);
    await expect(page.locator("#import")).toHaveValue("");
  }
});

test("pilot completes, exports results, and opens a replay", async ({
  page,
}) => {
  await preparePilot(page);
  await page.locator("#start-batch").click();
  await expect(page.locator("#batch-status")).toContainText("Finished 9 runs");
  await expect(page.locator("#results tr")).toHaveCount(9);
  await expect(page.locator("#start-batch")).toBeEnabled();
  await expect(page.locator("#cancel-batch")).toBeDisabled();
  await page
    .locator("#results tr")
    .first()
    .getByRole("textbox")
    .fill("Interesting");
  await page.locator("#results tr").first().getByRole("textbox").press("Tab");
  const downloading = page.waitForEvent("download");
  await page.locator("#export-batch").click();
  const download = await downloading;
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.results).toHaveLength(9);
  expect(exported.results[0].config.generations).toBe(2);
  expect(exported.results[0].tag).toBe("Interesting");
  expect(exported.results[0]).not.toHaveProperty("finalGrid");
  expect(exported.results[0]).not.toHaveProperty("measurements");
  await page
    .locator("#results tr")
    .first()
    .getByRole("button", { name: "Open ↗" })
    .click();
  await expect(page.locator("#lab")).toBeVisible();
  await expect(page.locator("#generation")).toHaveText("0");
  await expect(page.locator("#notes")).toHaveValue("Interesting");
});

test("a cancelled pilot can be restarted", async ({ page }) => {
  await preparePilot(page);
  // Both clicks precede worker replies, so cancellation is deterministic even on fast hosts.
  await page.evaluate(() => {
    (document.querySelector("#start-batch") as HTMLButtonElement).click();
    (document.querySelector("#cancel-batch") as HTMLButtonElement).click();
  });
  await expect(page.locator("#batch-status")).toContainText("Cancelled.");
  await expect(page.locator("#cancel-batch")).toBeDisabled();
  await expect(page.locator("#start-batch")).toBeEnabled();
  await page.locator("#start-batch").click();
  await expect(page.locator("#batch-status")).toContainText("Finished 9 runs");
  await expect(page.locator("#results tr")).toHaveCount(9);
});

test("paired mode advances synchronized noisy and noiseless worlds", async ({
  page,
}) => {
  await makeBlinker(page);
  await page.locator("#paired").check();
  await expect(page.locator("#comparison")).toBeVisible();
  const equalCanvases = () =>
    page.evaluate(
      () =>
        (document.querySelector("#grid") as HTMLCanvasElement).toDataURL() ===
        (
          document.querySelector("#comparison") as HTMLCanvasElement
        ).toDataURL(),
    );
  expect(await equalCanvases()).toBe(true);
  await page.locator("#step").click();
  expect(await equalCanvases()).toBe(true);
  await page.locator("#noise").fill("1");
  await page.locator("#noise").press("Tab");
  await expect(page.locator("#generation")).toHaveText("0");
  await page.locator("#step").click();
  await expect(page.locator("#generation")).toHaveText("1");
  expect(await equalCanvases()).toBe(false);
  await page.locator("#reset").click();
  expect(await equalCanvases()).toBe(true);
});

test("invalid seeds show feedback and preserve a usable simulation", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: testInfo.outputPath("desktop.png"),
    fullPage: true,
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await makeBlinker(page);
  await page.locator("#step").click();
  for (const seed of ["-1", "1.5", "4294967296"]) {
    await page.locator("#seed").fill(seed);
    await page.locator("#generate").click();
    await expect(page.locator("#message")).toHaveText(
      "Seeds must be integers from 0 to 4294967295.",
    );
    await expect(page.locator("#generation")).toHaveText("1");
    await expect(page.locator("#population")).toHaveText("3");
  }
  await page.locator("#seed").fill("42");
  await page.locator("#generate").click();
  await expect(page.locator("#generation")).toHaveText("0");
  for (const seed of ["-1", "1.5", "4294967296"]) {
    await page.locator("#noise-seed").fill(seed);
    await page.locator("#noise-seed").press("Tab");
    await expect(page.locator("#message")).toContainText(
      "Seeds must be integers",
    );
    await expect(page.locator("#noise-seed")).toHaveValue("7");
  }
  await page.locator("#step").click();
  await expect(page.locator("#population")).toHaveText("3");
  await preparePilot(page);
  await page.locator("#sampling-seed").fill("1.5");
  await page.locator("#start-batch").click();
  await expect(page.locator("#message")).toContainText("unsigned 32-bit seed");
  await expect(page.locator("#start-batch")).toBeEnabled();
  await expect(page.locator("#cancel-batch")).toBeDisabled();
  await expect(page.locator("#results tr")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("noise study renders replicate summaries and exports matched controls", async ({
  page,
}) => {
  await page.locator("#experiments-tab").click();
  await page.locator("#protocol").selectOption("noise");
  await page.locator("#batch-size").selectOption("64");
  await page.locator("#duration").fill("1");
  await page.locator("#start-batch").click();
  await expect(page.locator("#batch-status")).toContainText("Finished 50 runs");
  await expect(page.locator("#results tr")).toHaveCount(50);
  await expect(page.locator("#aggregates summary")).toHaveText(
    "Replicate summaries · mean ± sample SD",
  );
  const groups = page
    .locator("#aggregates tr")
    .filter({ has: page.locator("td") });
  await expect(groups).toHaveCount(5);
  for (let index = 0; index < 5; index++) {
    await expect(groups.nth(index).locator("td").nth(1)).toHaveText("10");
    await expect(groups.nth(index).locator("td").nth(2)).toContainText("±");
    await expect(groups.nth(index).locator("td").nth(3)).toContainText("±");
  }
  await expect(groups.first().locator("td").nth(4)).toHaveText("0.00% ± 0.00%");
  const downloading = page.waitForEvent("download");
  await page.locator("#export-batch").click();
  const download = await downloading;
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.protocol).toBe("noise");
  expect(exported.aggregates).toHaveLength(5);
  expect(exported.results).toHaveLength(50);
  expect(
    exported.aggregates.every((group: { count: number }) => group.count === 10),
  ).toBe(true);
});

test("mobile playground and experiment tables fit a 390 pixel viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("mobile.png"),
    fullPage: true,
  });
  const expectNoOverflow = async () => {
    const dimensions = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  };
  await expectNoOverflow();
  await page.locator("#step").click();
  await expect(page.locator("#generation")).toHaveText("1");
  await page.locator("#paired").check();
  await expect(page.locator("#comparison")).toBeVisible();
  await expectNoOverflow();
  await preparePilot(page);
  await page.locator("#start-batch").click();
  await expect(page.locator("#batch-status")).toContainText("Finished 9 runs");
  await expectNoOverflow();
  await page.locator("#notebook-tab").click();
  await expectNoOverflow();
});
