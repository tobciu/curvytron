/**
 * Canvas
 *
 * @param {Number} width
 * @param {Number} height
 * @param {Element} element
 */
export class Canvas {
    constructor(width, height, element) {
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
     *
     * @param {Number} width
     */
    setWidth(width) {
        this.element.width = width;
    }

    /**
     * Set height
     *
     * @param {Number} height
     */
    setHeight(height) {
        this.element.height = height;
    }

    /**
     * Set scale
     *
     * @param {Float} scale
     */
    setScale(scale) {
        this.scale = scale;
    }

    /**
     * Set dimension
     *
     * @param {Number} width
     * @param {Number} height
     * @param {Number} scale
     */
    setDimension(width, height, scale, update) {
        let save;

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
            this.drawImage(save.element, 0, 0, this.element.width, this.element.height);
            save = null;
        }
    }

    /**
     * Set opacity
     *
     * @param {Float} opacity
     */
    setOpacity(opacity) {
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
    color(color) {
        this.context.fillStyle = color;
        this.context.fillRect(0, 0, this.element.width, this.element.height);
    }

    /**
     * Clear rectangular zone
     */
    clearZone(x, y, width, height) {
        this.context.clearRect(x, y, width, height);
    }

    /**
     * Clear rectangular zone scaled
     */
    clearZoneScaled(x, y, width, height) {
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
     *
     * @param {Resource} image
     * @param {Number} x
     * @param {Number} y
     * @param {Number} width
     * @param {Number} height
     */
    drawImageScaled(image, x, y, width, height) {
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
     *
     * @param {Resource} image
     * @param {Number} x
     * @param {Number} y
     * @param {Number} width
     * @param {Number} height
     * @param {Float} angle
     */
    drawImageScaledAngle(image, x, y, width, height, angle) {
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
     *
     * @param {Resource} image
     * @param {Number} x
     * @param {Number} y
     * @param {Number} width
     * @param {Number} height
     */
    drawImage(image, x, y, width, height) {
        this.context.drawImage(image, x, y, width, height);
    }

    /**
     * Draw image to size
     *
     * @param {Resource} image
     * @param {Number} x
     * @param {Number} y
     * @param {Number} width
     * @param {Number} height
     */
    drawImageTo(image, x, y) {
        this.context.drawImage(image, x, y);
    }

    /**
     * Past image
     *
     * @param {Resource} image
     */
    pastImage(image) {
        this.context.drawImage(image, 0, 0);
    }

    /**
     * Draw circle
     *
     * @param {Number} x
     * @param {Number} y
     * @param {Number} radius
     * @param {String} color
     */
    drawCircle(x, y, radius, color, borderColor) {
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
     *
     * @param {Array} points
     * @param {Number} width
     * @param {String} color
     * @param {String} style
     */
    drawLine(points, width, color, style) {
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
     *
     * @param {Array} points
     * @param {Number} width
     * @param {String} color
     * @param {String} style
     */
    drawLineScaled(points, width, color, style) {
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
     *
     * @return {String}
     */
    toString() {
        return this.element.toDataURL();
    }

    /**
     * Round
     *
     * @param {Number} value
     *
     * @return {Number}
     */
    round(value) {
        return (0.5 + value) | 0;
    }

    /**
     * Round float
     *
     * @param {Float} value
     * @param {Number} precision
     *
     * @return {Float}
     */
    roundFloat(value, precision) {
        const coef = Math.pow(10, typeof precision !== 'undefined' ? precision : 2);

        return ((0.5 + value * coef) | 0) / coef;
    }
}

/**
 * Two pi
 *
 * @type {Number}
 */
Canvas.prototype.twoPi = 2 * Math.PI;
