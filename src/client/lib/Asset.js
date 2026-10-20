/**
 * Asset
 *
 * @param {string} source
 * @param {Function} callback
 * @param {Boolean} load
 */
export class Asset {
    constructor(source, callback, load) {
        this.element = new Image();
        this.source = source;

        this.element.asset = this;
        this.element.addEventListener('load', callback);

        if (typeof load !== 'undefined' && load) {
            this.load();
        }
    }

    /**
     * Set source
     *
     * @param {String} source
     */
    setSource(source) {
        this.source = source;
    }

    /**
     * Load
     */
    load() {
        this.element.src = this.source;
    }

    /**
     * Get image
     *
     * @return {Image}
     */
    getImage() {
        return this.element;
    }

    /**
     * Get image width
     *
     * @return {Number}
     */
    getWidth() {
        return this.element.width;
    }

    /**
     * Get image height
     *
     * @return {Number}
     */
    getHeight() {
        return this.element.height;
    }
}
