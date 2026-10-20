/**
 * Canvas
 */
export class Canvas {
    element: any;
    context: any;
    scale: any;

    /**
     * Two pi
     */
    twoPi: number = 2 * Math.PI;

    constructor(width?: any, height?: any, element?: any) {
        this.element = typeof element !== 'undefined' ? element : document.createElement('canvas');
        this.context = this.element.getContext('2d');
        this.scale = 1;

        if (typeof width !== 'undefined' && width) {
            this.setWidth(width);
        }

        if (typeof height !== 'undefined' && height) {
            this.setHeight(height);
        }
    }

    /**
     * Set width
     */
    setWidth(width: number) {
        this.element.width = width;
    }

    /**
     * Set height
     */
    setHeight(height: number) {
        this.element.height = height;
    }

    /**
     * Set scale
     */
    setScale(scale: number) {
        this.scale = scale;
    }

    /**
     * Set dimension
     */
    setDimension(width: number, height: number, scale?: number, update?: any) {
        let save: Canvas | null = null;

        width = Math.ceil(width);
        height = Math.ceil(height);

        if (update) {
            save = new Canvas(this.element.width, this.element.height);
            save.pastImage(this.element);
        }

        this.element.width = width;
        this.element.height = height;

        if (typeof scale !== 'undefined') {
            this.setScale(scale);
        }

        if (update) {
            this.drawImage(save!.element, 0, 0, this.element.width, this.element.height);
            save = null;
        }
    }

    /**
     * Set opacity
     */
    setOpacity(opacity: number) {
        this.context.globalAlpha = opacity;
    }

    /**
     * Clear
     */
    clear() {
        this.context.clearRect(0, 0, this.element.width, this.element.height);
    }

    /**
     * Color
     */
    color(color: any) {
        this.context.fillStyle = color;
        this.context.fillRect(0, 0, this.element.width, this.element.height);
    }

    /**
     * Clear rectangular zone
     */
    clearZone(x: any, y: any, width: any, height: any) {
        this.context.clearRect(x, y, width, height);
    }

    /**
     * Clear rectangular zone scaled
     */
    clearZoneScaled(x: any, y: any, width: any, height: any) {
        this.clearZone(
            this.round(x * this.scale),
            this.round(y * this.scale),
            this.round(width * this.scale),
            this.round(height * this.scale)
        );
    }

    /**
     * Save context
     */
    save() {
        this.context.save();
    }

    /**
     * Restore context
     */
    restore() {
        this.context.restore();
    }

    /**
     * Reverse image
     */
    reverse() {
        this.context.save();
        this.context.translate(this.element.width, 0);
        this.context.scale(-1, 1);
    }

    /**
     * Draw image to scale
     */
    drawImageScaled(image: any, x: number, y: number, width: number, height: number) {
        this.context.drawImage(
            image,
            this.round(x * this.scale),
            this.round(y * this.scale),
            this.round(width * this.scale),
            this.round(height * this.scale)
        );
    }

    /**
     * Draw image to scale
     */
    drawImageScaledAngle(image: any, x: number, y: number, width: number, height: number, angle: number) {
        x = this.round(x * this.scale);
        y = this.round(y * this.scale);
        width = this.round((width / 2) * this.scale);
        height = this.round((height / 2) * this.scale);

        const centerX = x + width,
            centerY = y + height;

        x = -width;
        y = -height;

        this.context.save();
        this.context.translate(centerX, centerY);
        this.context.rotate(angle);
        this.context.drawImage(image, x, y, width * 2, height * 2);
        this.context.restore();
    }

    /**
     * Draw image to size
     */
    drawImage(image: any, x: number, y: number, width: number, height: number) {
        this.context.drawImage(image, x, y, width, height);
    }

    /**
     * Draw image to size
     */
    drawImageTo(image: any, x: number, y: number) {
        this.context.drawImage(image, x, y);
    }

    /**
     * Past image
     */
    pastImage(image: any) {
        this.context.drawImage(image, 0, 0);
    }

    /**
     * Draw circle
     */
    drawCircle(x: number, y: number, radius: number, color: string, borderColor: any) {
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, this.twoPi, false);
        this.context.fillStyle = color;
        this.context.fill();
        if (color !== borderColor) {
            this.context.lineWidth = 5;
            this.context.strokeStyle = borderColor;
            this.context.stroke();
        }
    }

    /**
     * Draw line
     */
    drawLine(points: any[], width: number, color: string, style: string) {
        const length = points.length;

        if (length > 1) {
            this.context.lineCap = style;
            this.context.strokeStyle = color;
            this.context.lineWidth = width;
            this.context.beginPath();
            this.context.moveTo(points[0][0], points[0][1]);

            for (let i = 1; i < length; i++) {
                this.context.lineTo(points[i][0], points[i][1]);
            }

            this.context.stroke();
        }
    }

    /**
     * Draw line scaled
     */
    drawLineScaled(points: any[], width: number, color: string, style: string) {
        const length = points.length;

        if (length > 1) {
            this.context.lineCap = style;
            this.context.strokeStyle = color;
            this.context.lineWidth = width * this.scale;
            this.context.beginPath();
            this.context.moveTo(points[0][0] * this.scale, points[0][1] * this.scale);

            for (let i = 1; i < length; i++) {
                this.context.lineTo(points[i][0] * this.scale, points[i][1] * this.scale);
            }

            this.context.stroke();
        }
    }

    /**
     * To string
     */
    toString(): string {
        return this.element.toDataURL();
    }

    /**
     * Round
     */
    round(value: number): number {
        return (0.5 + value) | 0;
    }

    /**
     * Round float
     */
    roundFloat(value: number, precision?: number): number {
        const coef = Math.pow(10, typeof precision !== 'undefined' ? precision : 2);

        return ((0.5 + value * coef) | 0) / coef;
    }
}
