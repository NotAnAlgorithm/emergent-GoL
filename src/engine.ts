/** Pure, synchronous binary outer-totalistic cellular automata. */
export type Boundary = 'wrap' | 'dead';
export interface Rule { birth: number[]; survival: number[] }

function validateCounts(counts: number[]): void {
  if (!Array.isArray(counts) || counts.some(n => !Number.isInteger(n) || n < 0 || n > 8) || new Set(counts).size !== counts.length) {
    throw new Error('Rule counts must be distinct integers from 0 to 8.');
  }
}

export function parseRule(text: string): Rule {
  const match = /^B([0-8]*)\/S([0-8]*)$/i.exec(text.trim());
  if (!match) throw new Error('Use B…/S… notation with neighbor counts from 0 to 8.');
  const rule = { birth: [...match[1]].map(Number), survival: [...match[2]].map(Number) };
  validateCounts(rule.birth);
  validateCounts(rule.survival);
  rule.birth.sort((a, b) => a - b);
  rule.survival.sort((a, b) => a - b);
  return rule;
}

export function formatRule(rule: Rule): string {
  validateCounts(rule.birth);
  validateCounts(rule.survival);
  return `B${[...rule.birth].sort((a, b) => a - b).join('')}/S${[...rule.survival].sort((a, b) => a - b).join('')}`;
}

function validateDimensions(width: number, height: number): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || !Number.isSafeInteger(width * height)) {
    throw new Error('Grid dimensions must be positive integers.');
  }
}

function validateProbability(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Probability must be between 0 and 1.');
}

/** Mulberry32; integer seeds are normalized to unsigned 32-bit values. */
export function createRng(seed: number): () => number {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed must be a safe integer.');
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomGrid(width: number, height: number, density: number, seed: number): Uint8Array {
  validateDimensions(width, height);
  validateProbability(density);
  const rng = createRng(seed);
  return Uint8Array.from({ length: width * height }, () => Number(rng() < density));
}

export function step(
  grid: Uint8Array, width: number, height: number, rule: Rule,
  boundary: Boundary, noiseProbability = 0, rng: () => number = Math.random,
): Uint8Array {
  validateDimensions(width, height);
  validateProbability(noiseProbability);
  validateCounts(rule.birth);
  validateCounts(rule.survival);
  if (grid.length !== width * height || grid.some(cell => cell !== 0 && cell !== 1)) throw new Error('Grid must contain one binary value per cell.');
  if (boundary !== 'wrap' && boundary !== 'dead') throw new Error('Unknown boundary mode.');
  const birth = new Uint8Array(9);
  const survival = new Uint8Array(9);
  rule.birth.forEach(n => { birth[n] = 1; });
  rule.survival.forEach(n => { survival[n] = 1; });
  const next = new Uint8Array(grid.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let neighbors = 0;
      if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
        const i = y * width + x;
        neighbors = grid[i - width - 1] + grid[i - width] + grid[i - width + 1]
          + grid[i - 1] + grid[i + 1]
          + grid[i + width - 1] + grid[i + width] + grid[i + width + 1];
      } else {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            let nx = x + dx;
            let ny = y + dy;
            if (boundary === 'wrap') {
              nx = (nx + width) % width;
              ny = (ny + height) % height;
            } else if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            neighbors += grid[ny * width + nx];
          }
        }
      }
      const index = y * width + x;
      let value = grid[index] ? survival[neighbors] : birth[neighbors];
      if (noiseProbability > 0) {
        const sample = rng();
        if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new Error('Random values must be in [0, 1).');
        if (sample < noiseProbability) value ^= 1;
      }
      next[index] = value;
    }
  }
  return next;
}

export function metrics(before: Uint8Array, after: Uint8Array): { density: number; activity: number } {
  if (before.length === 0 || before.length !== after.length) throw new Error('Measurements require equal, nonempty grids.');
  let live = 0;
  let changed = 0;
  for (let i = 0; i < after.length; i++) {
    if (before[i] > 1 || after[i] > 1) throw new Error('Measurements require binary grids.');
    live += after[i];
    changed += Number(before[i] !== after[i]);
  }
  return { density: live / after.length, activity: changed / after.length };
}

export function patternGrid(name: 'block' | 'blinker' | 'glider', width: number, height: number): Uint8Array {
  validateDimensions(width, height);
  const patterns = {
    block: [[0, 0], [1, 0], [0, 1], [1, 1]],
    blinker: [[0, 0], [1, 0], [2, 0]],
    glider: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
  };
  const cells = patterns[name];
  if (!cells) throw new Error('Unknown pattern.');
  const patternWidth = Math.max(...cells.map(([x]) => x)) + 1;
  const patternHeight = Math.max(...cells.map(([, y]) => y)) + 1;
  if (width < patternWidth || height < patternHeight) throw new Error('Pattern does not fit the grid.');
  const offsetX = Math.floor((width - patternWidth) / 2);
  const offsetY = Math.floor((height - patternHeight) / 2);
  const grid = new Uint8Array(width * height);
  for (const [x, y] of cells) grid[(offsetY + y) * width + offsetX + x] = 1;
  return grid;
}
