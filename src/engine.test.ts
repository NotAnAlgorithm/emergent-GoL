import { describe, expect, it } from 'vitest';
import { createRng, formatRule, metrics, parseRule, patternGrid, randomGrid, step } from './engine';

const life = parseRule('B3/S23');

describe('rules', () => {
  it('canonicalizes counts without mutating callers', () => {
    expect(parseRule(' b63/s32 ')).toEqual({ birth: [3, 6], survival: [2, 3] });
    const rule = { birth: [6, 3], survival: [] };
    expect(formatRule(rule)).toBe('B36/S');
    expect(rule.birth).toEqual([6, 3]);
    expect(parseRule('B/S')).toEqual({ birth: [], survival: [] });
  });
  it.each(['B9/S23', 'B33/S23', 'B3/S22', '23/3', 'B-1/S', 'B3/S2x'])('rejects %s', text => {
    expect(() => parseRule(text)).toThrow();
  });
  it('evaluates all birth and survival neighbor counts', () => {
    const neighbors = [0, 1, 2, 3, 5, 6, 7, 8];
    for (let count = 0; count <= 8; count++) {
      for (const alive of [0, 1]) {
        const grid = new Uint8Array(9);
        neighbors.slice(0, count).forEach(i => { grid[i] = 1; });
        grid[4] = alive;
        const matching = alive ? { birth: [], survival: [count] } : { birth: [count], survival: [] };
        const opposite = alive ? { birth: [count], survival: [] } : { birth: [], survival: [count] };
        expect(step(grid, 3, 3, matching, 'dead')[4]).toBe(1);
        expect(step(grid, 3, 3, opposite, 'dead')[4]).toBe(0);
        expect(step(grid, 3, 3, { birth: [], survival: [] }, 'dead')[4]).toBe(0);
      }
    }
  });
});

describe('synchronous evolution', () => {
  it('preserves a block and leaves the input untouched', () => {
    const grid = patternGrid('block', 8, 8);
    const original = grid.slice();
    const next = step(grid, 8, 8, life, 'dead');
    expect(next).toEqual(original);
    expect(next).not.toBe(grid);
    expect(grid).toEqual(original);
  });
  it('rotates a blinker then restores it', () => {
    const grid = patternGrid('blinker', 5, 5);
    const next = step(grid, 5, 5, life, 'dead');
    expect([...next.entries()].filter(([, cell]) => cell).map(([i]) => i)).toEqual([7, 12, 17]);
    expect(step(next, 5, 5, life, 'dead')).toEqual(grid);
  });
  it('moves a glider diagonally after four generations', () => {
    const original = patternGrid('glider', 12, 12);
    let grid = original;
    for (let i = 0; i < 4; i++) grid = step(grid, 12, 12, life, 'dead');
    const expected = new Uint8Array(144);
    original.forEach((cell, i) => { if (cell) expected[i + 13] = 1; });
    expect(grid).toEqual(expected);
  });
  it('wraps neighbor coordinates across both edges', () => {
    const grid = new Uint8Array(25);
    [24, 20, 4].forEach(i => { grid[i] = 1; });
    expect(step(grid, 5, 5, life, 'wrap')[0]).toBe(1);
    expect(step(grid, 5, 5, life, 'dead')[0]).toBe(0);
  });
  it('counts eight neighborhood positions on a one-cell torus', () => {
    expect(step(new Uint8Array([1]), 1, 1, parseRule('B/S8'), 'wrap')[0]).toBe(1);
  });
  it('revives an empty B0 grid', () => {
    expect(step(new Uint8Array(16), 4, 4, parseRule('B0/S'), 'dead')).toEqual(new Uint8Array(16).fill(1));
  });
  it('matches a simple reference across asymmetric grids and rules', () => {
    for (const [width, height] of [[1, 3], [2, 2], [7, 4]]) {
      for (const boundary of ['wrap', 'dead'] as const) {
        for (const notation of ['B3/S23', 'B0368/S1247', 'B/S012345678']) {
          const grid = randomGrid(width, height, 0.45, 90);
          const rule = parseRule(notation);
          const expected = grid.map((alive, index) => {
            const x = index % width;
            const y = Math.floor(index / width);
            const offsets = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
            const count = offsets.reduce((sum, [dx, dy]) => {
              const nx = x + dx;
              const ny = y + dy;
              if (boundary === 'dead' && (nx < 0 || nx >= width || ny < 0 || ny >= height)) return sum;
              return sum + grid[((ny + height) % height) * width + (nx + width) % width];
            }, 0);
            return Number((alive ? rule.survival : rule.birth).includes(count));
          });
          expect(step(grid, width, height, rule, boundary)).toEqual(expected);
        }
      }
    }
  });
});

describe('randomness and measurements', () => {
  it('replays random grids and keeps probabilities bounded', () => {
    expect(randomGrid(20, 20, 0.3, 42)).toEqual(randomGrid(20, 20, 0.3, 42));
    expect(randomGrid(20, 20, 0.3, 42)).not.toEqual(randomGrid(20, 20, 0.3, 43));
    expect(randomGrid(3, 2, 0, 1)).toEqual(new Uint8Array(6));
    expect(randomGrid(3, 2, 1, 1)).toEqual(new Uint8Array(6).fill(1));
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) { const sample = rng(); expect(sample).toBeGreaterThanOrEqual(0); expect(sample).toBeLessThan(1); }
  });
  it('applies noise after the update and replays its stream', () => {
    const grid = randomGrid(12, 12, 0.3, 8);
    const clean = step(grid, 12, 12, life, 'wrap');
    expect(step(grid, 12, 12, life, 'wrap', 0, () => { throw new Error('unused'); })).toEqual(clean);
    expect(step(grid, 12, 12, life, 'wrap', 1, createRng(5))).toEqual(clean.map(cell => cell ^ 1));
    const run = () => { let current = grid; const rng = createRng(99); for (let i = 0; i < 10; i++) current = step(current, 12, 12, life, 'wrap', 0.1, rng); return current; };
    expect(run()).toEqual(run());
  });
  it('reports live density and changed-cell fraction', () => {
    expect(metrics(new Uint8Array([0, 0, 1, 1]), new Uint8Array([0, 1, 0, 0]))).toEqual({ density: 0.25, activity: 0.75 });
  });
  it('rejects invalid inputs', () => {
    expect(() => randomGrid(0, 4, 0.3, 1)).toThrow();
    expect(() => randomGrid(4, 4, NaN, 1)).toThrow();
    expect(() => createRng(0.5)).toThrow();
    expect(() => step(new Uint8Array(3), 2, 2, life, 'dead')).toThrow();
    expect(() => step(new Uint8Array([2]), 1, 1, life, 'dead')).toThrow();
    expect(() => step(new Uint8Array(4), 2, 2, life, 'dead', -1)).toThrow();
    expect(() => step(new Uint8Array(4), 2, 2, life, 'dead', 1, () => 1)).toThrow();
    expect(() => patternGrid('glider', 2, 2)).toThrow();
    expect(() => metrics(new Uint8Array(), new Uint8Array())).toThrow();
  });
});
