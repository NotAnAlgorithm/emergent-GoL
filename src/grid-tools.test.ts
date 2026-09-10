import { expect, it } from "vitest";
import { expandGrid } from "./grid-tools";

it("centers an exact rectangular state without new cells or edge wrapping", () => {
  const grid = Uint8Array.from([1, 0, 0, 1, 1, 1]);
  const result = expandGrid(grid, 3, 2);
  expect([result.width, result.height]).toEqual([6, 4]);
  expect(Array.from(result.cells)).toEqual([
    0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  expect(() => expandGrid(new Uint8Array(1024), 1024, 1)).toThrow(/1024/);
});
