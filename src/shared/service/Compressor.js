/**
 * Data compressor / decompressor for transport
 */
export class Compressor {
    /**
     * Compress a float into an integer
     *
     * @param {Float} value
     *
     * @return {Integer}
     */
    compress(value) {
        return (0.5 + value * this.precision) | 0;
    }

    /**
     * Decompress an integer into an float
     *
     * @param {Integer} value
     *
     * @return {Float}
     */
    decompress(value) {
        return value / this.precision;
    }
}

/**
 * Float precision
 *
 * @type {Number}
 */
Compressor.prototype.precision = 100;
