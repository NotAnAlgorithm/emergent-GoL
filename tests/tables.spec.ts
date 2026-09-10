import { expect, test } from "@playwright/test";

test("result columns filter, sort numerically, reset, and preserve replay notes", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#experiments-tab").click();
  await page.locator("#protocol").selectOption("pilot");
  await page.locator("#batch-size").selectOption("64");
  await page.locator("#duration").fill("2");
  const table = page.locator("table").filter({ has: page.locator("#results") });
  // Filters selected before worker results arrive must apply to incoming rows.
  await table
    .getByRole("searchbox", { name: "Filter Start density", exact: true })
    .fill("10..30");
  await page.locator("#start-batch").click();
  await expect(page.locator("#batch-status")).toContainText("Finished 9 runs");
  await expect(page.locator("#results tr:visible")).toHaveCount(9);
  await table
    .getByRole("searchbox", { name: "Filter Start density", exact: true })
    .fill("");
  await table
    .getByRole("button", { name: "Sort by Mean density", exact: true })
    .click();
  const densities = await page
    .locator("#results tr")
    .evaluateAll((rows) =>
      rows.map((row) => parseFloat(row.children[4].textContent!)),
    );
  expect(densities).toEqual([...densities].sort((a, b) => a - b));
  await expect(table.locator('th[aria-sort="ascending"]')).toContainText(
    "Mean density",
  );
  await table
    .getByRole("button", { name: "Sort by Mean density", exact: true })
    .click();
  const descending = await page
    .locator("#results tr")
    .evaluateAll((rows) =>
      rows.map((row) => parseFloat(row.children[4].textContent!)),
    );
  expect(descending).toEqual([...densities].sort((a, b) => b - a));
  await page
    .locator("#results tr")
    .first()
    .getByRole("textbox")
    .fill("Growing blob");
  await table
    .getByRole("searchbox", { name: "Filter Observation", exact: true })
    .fill("BLOB");
  await expect(page.locator("#results tr:visible")).toHaveCount(1);
  await table
    .getByRole("searchbox", { name: "Filter Rule", exact: true })
    .fill("missing");
  await expect(page.locator("#results tr:visible")).toHaveCount(0);
  await expect(table.locator("..").locator(".table-empty")).toContainText(
    "No matching rows",
  );
  await table
    .locator("..")
    .getByRole("button", { name: "Reset table" })
    .click();
  await expect(page.locator("#results tr:visible")).toHaveCount(9);
  await table
    .getByRole("searchbox", { name: "Filter Observation", exact: true })
    .fill("blob");
  await page
    .locator("#results tr:visible")
    .getByRole("button", { name: "Open ↗" })
    .click();
  await expect(page.locator("#notes")).toHaveValue("Growing blob");
});

test("aggregate columns filter numeric means and sort by mean rather than deviation", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#experiments-tab").click();
  await page.locator("#protocol").selectOption("noise");
  await page.locator("#batch-size").selectOption("64");
  await page.locator("#duration").fill("2");
  await page.locator("#start-batch").click();
  await expect(page.locator("#batch-status")).toContainText("Finished 50 runs");
  const table = page.locator("#aggregates table");
  await table
    .getByRole("button", { name: "Sort by Density", exact: true })
    .click();
  const means = await table
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) => parseFloat(row.children[4].textContent!)),
    );
  expect(means).toEqual([...means].sort((a, b) => a - b));
  await table
    .getByRole("searchbox", { name: "Filter Noise", exact: true })
    .fill("<=0.001");
  await expect(table.locator("tbody tr:visible")).toHaveCount(3);
  await table
    .getByRole("searchbox", { name: "Filter Trials", exact: true })
    .fill(">10");
  await expect(table.locator("tbody tr:visible")).toHaveCount(0);
  await table
    .locator("..")
    .getByRole("button", { name: "Reset table" })
    .click();
  await expect(table.locator("tbody tr:visible")).toHaveCount(5);
});
