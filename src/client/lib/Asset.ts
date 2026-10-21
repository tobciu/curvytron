/**
 * Asset
 */
export class Asset {
    element: any;
    source: any;

    constructor(source: any, callback: any, load?: any) {
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
     */
    setSource(source: string) {
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
     */
    getImage() {
        return this.element;
    }

    /**
     * Get image width
     */
    getWidth(): number {
        return this.element.width;
    }

    /**
     * Get image height
     */
    getHeight(): number {
        return this.element.height;
    }
}
