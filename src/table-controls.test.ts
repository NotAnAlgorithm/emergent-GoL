import { describe, expect, it } from "vitest";
import { compareValues, matchesFilter, tableNumber } from "./table-controls";

describe("table values", () => {
  it("sorts numeric means, decimals, and seeds numerically", () => {
    expect(compareValues("10", "2", true)).toBeGreaterThan(0);
    expect(compareValues("9.5% ± 4.0%", "20% ± 1%", true)).toBeLessThan(0);
    expect(tableNumber("0.0001")).toBe(0.0001);
    expect(tableNumber("B3/S23")).toBeNaN();
    expect(compareValues("—", "2", true)).toBeGreaterThan(0);
    expect(compareValues("Blob", "blob", false)).toBe(0);
  });
  it("filters text without case sensitivity", () => {
    expect(matchesFilter("Growing blob", "BLOB", false)).toBe(true);
    expect(matchesFilter("B36/S23", "b3", false)).toBe(true);
    expect(matchesFilter("B36/S23", "B2", false)).toBe(false);
  });
  it("supports inclusive numeric ranges and comparisons in displayed units", () => {
    for (const query of [
      "5..20",
      ">=10",
      "<=10%",
      "10",
      "=10",
      ">9",
      "<11",
      "1e1",
    ]) {
      expect(matchesFilter("10% ± 2%", query, true), query).toBe(true);
    }
    for (const query of ["10.1..20", ">10", "<10", "1", "bad", "20..5"]) {
      expect(matchesFilter("10% ± 2%", query, true), query).toBe(false);
    }
    expect(matchesFilter("—", "", true)).toBe(true);
    expect(matchesFilter("—", ">0", true)).toBe(false);
    expect(matchesFilter("0.0001", "0..0.001", true)).toBe(true);
  });
});
