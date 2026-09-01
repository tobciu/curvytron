import { describe, expect, it } from 'vitest';
import { Compressor } from './Compressor.ts';

describe('Compressor', () => {
  const c = new Compressor();

  it('round-trips positive floats to 2 decimals', () => {
    for (const v of [0, 1, 12.34, 87.65, 143.2, 0.01]) {
      expect(c.decompress(c.compress(v))).toBeCloseTo(v, 2);
    }
  });

  it('compresses to an integer', () => {
    expect(c.compress(12.34)).toBe(1234);
    expect(c.compress(12.345)).toBe(1235); // 0.5 bias rounds half up
    expect(Number.isInteger(c.compress(3.14159))).toBe(true);
  });

  it('truncates toward zero for negatives (legacy behaviour)', () => {
    // (0.5 + -1.234 * 100) | 0  ===  -122.9 | 0  ===  -122
    expect(c.compress(-1.234)).toBe(-122);
  });

  it('respects a custom precision', () => {
    const c1 = new Compressor(1);
    expect(c1.compress(9.9)).toBe(10);
    expect(c1.decompress(10)).toBe(10);
  });
});
