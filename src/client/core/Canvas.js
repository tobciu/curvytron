/**
 * Canvas
 */
export default class Canvas {
    /**
     * @param {Number} width
     * @param {Number} height
     * @param {HTMLCanvasElement} element
     */
    constructor(width, height, element) {
        this.element = element || document.createElement('canvas');
        this.context = this.element.getContext('2d');
        this.scale = 1;
        this.twoPi = 2 * Math.PI;

        if (width) {
            this.setWidth(width);
        }

        if (height) {
            this.setHeight(height);
        }
    }

    setWidth(width) {
        this.element.width = width;
    }

    setHeight(height) {
        this.element.height = height;
    }

    setScale(scale) {
        this.scale = scale;
    }

    setDimension(width, height, scale, update) {
        width = Math.ceil(width);
        height = Math.ceil(height);

        if (update) {
            const save = new Canvas(this.element.width, this.element.height);
            save.pastImage(this.element);
            this.element.width = width;
            this.element.height = height;
            if (scale) {
                this.setScale(scale);
            }
            this.drawImage(save.element, 0, 0, this.element.width, this.element.height);
        } else {
            this.element.width = width;
            this.element.height = height;
            if (scale) {
                this.setScale(scale);
            }
        }
    }

    setOpacity(opacity) {
        this.context.globalAlpha = opacity;
    }

    clear() {
        this.context.clearRect(0, 0, this.element.width, this.element.height);
    }

    color(color) {
        this.context.fillStyle = color;
        this.context.fillRect(0, 0, this.element.width, this.element.height);
    }

    clearZone(x, y, width, height) {
        this.context.clearRect(x, y, width, height);
    }

    clearZoneScaled(x, y, width, height) {
        this.clearZone(
            this.round(x * this.scale),
            this.round(y * this.scale),
            this.round(width * this.scale),
            this.round(height * this.scale)
        );
    }

    save() {
        this.context.save();
    }

    restore() {
        this.context.restore();
    }

    reverse() {
        this.context.save();
        this.context.translate(this.element.width, 0);
        this.context.scale(-1, 1);
    }

    drawImageScaled(image, x, y, width, height) {
        this.context.drawImage(
            image,
            this.round(x * this.scale),
            this.round(y * this.scale),
            this.round(width * this.scale),
            this.round(height * this.scale)
        );
    }

    drawImageScaledAngle(image, x, y, width, height, angle) {
        x = this.round(x * this.scale);
        y = this.round(y * this.scale);
        width = this.round(width / 2 * this.scale);
        height = this.round(height / 2 * this.scale);

        const centerX = x + width;
        const centerY = y + height;

        x = -width;
        y = -height;

        this.context.save();
        this.context.translate(centerX, centerY);
        this.context.rotate(angle);
        this.context.drawImage(image, x, y, width * 2, height * 2);
        this.context.restore();
    }

    drawImage(image, x, y, width, height) {
        this.context.drawImage(image, x, y, width, height);
    }

    drawImageTo(image, x, y) {
        this.context.drawImage(image, x, y);
    }

    pastImage(image) {
        this.context.drawImage(image, 0, 0);
    }

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

    toString() {
        return this.element.toDataURL();
    }

    round(value) {
        return (0.5 + value) | 0;
    }

    roundFloat(value, precision) {
        const coef = Math.pow(10, precision || 2);
        return ((0.5 + value * coef) | 0) / coef;
    }
}
