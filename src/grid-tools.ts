/** Preserve an exact state, centered in an empty domain. */
export function expandGrid(grid: Uint8Array, width: number, height: number) {
  if (grid.length !== width * height || width * 2 > 1024 || height * 2 > 1024)
    throw new Error("Expansion is limited to 1024 × 1024.");
  const nextWidth = width * 2;
  const nextHeight = height * 2;
  const cells = new Uint8Array(nextWidth * nextHeight);
  const left = Math.floor(width / 2);
  const top = Math.floor(height / 2);
  for (let y = 0; y < height; y++)
    cells.set(
      grid.subarray(y * width, (y + 1) * width),
      (top + y) * nextWidth + left,
    );
  return { cells, width: nextWidth, height: nextHeight };
}
