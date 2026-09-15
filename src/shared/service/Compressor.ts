/**
 * Packs floats into small integers for transport and back.
 *
 * `compress(v)` rounds `v * precision` to the nearest integer;
 * `decompress(i)` reverses it. Precision 100 → 2 decimal places.
 * Used for `position` / `angle` / bonus coordinates on the wire.
 */
export class Compressor {
  readonly precision: number;

  constructor(precision = 100) {
    this.precision = precision;
  }

  compress(value: number): number {
    return Math.trunc(0.5 + value * this.precision);
  }

  decompress(value: number): number {
    return value / this.precision;
  }
}
