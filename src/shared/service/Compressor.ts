/**
 * Data compressor / decompressor for transport
 */
export class Compressor {
    /**
     * Float precision
     */
    precision: number = 100;

    /**
     * Compress a float into an integer
     */
    compress(value: number): number {
        return (0.5 + value * this.precision) | 0;
    }

    /**
     * Decompress an integer into an float
     */
    decompress(value: number): number {
        return value / this.precision;
    }
}
