/**
 * Canvas for asset treatment
 */
export class AssetCanvas {
    element: any;
    context: any;

    constructor(width: any, height: any) {
        this.element = document.createElement('canvas');
        this.context = this.element.getContext('2d');

        this.element.width = width;
        this.element.height = height;
    }

    /**
     * Clear
     */
    clear() {
        this.context.clearRect(0, 0, this.element.width, this.element.height);
    }

    /**
     * To string
     */
    toString(): string {
        return this.element.toDataURL();
    }

    /**
     * Draw image from source
     */
    drawImageFromSource(image: HTMLImageElement, x: number, y: number) {
        const width = this.element.width,
            height = this.element.height;

        this.context.drawImage(image, x, y, width, height, 0, 0, width, height);
    }
}
