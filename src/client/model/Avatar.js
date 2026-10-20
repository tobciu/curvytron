import { Canvas } from '../core/Canvas.js';
import { PlayerInput } from './PlayerInput.js';
import { BaseAvatar } from '../../shared/model/BaseAvatar.js';
import { Trail } from './Trail.js';
import { BonusStack } from './BonusStack.js';

/**
 * Avatar
 *
 * @param {Player} player
 */
export class Avatar extends BaseAvatar {
    constructor(player) {
        super(player);

        this.local = player.local;
        this.canvas = new Canvas(100, 100);
        this.arrow = new Canvas(this.arrowSize, this.arrowSize);
        this.width = this.radius * 2;
        this.canvasWidth = this.canvas.element.width;
        this.canvasRadius = this.canvasWidth / 2;
        this.clearWidth = this.canvasWidth;
        this.startX = 0;
        this.startY = 0;
        this.clearX = 0;
        this.clearY = 0;
        this.elements = {
            root: null,
            roundScore: null,
            score: null
        };

        if (this.local) {
            this.input = new PlayerInput(this, player.getBinding());
        }

        this.drawArrow();
    }

    /**
     * Create the trail
     *
     * @return {Trail}
     */
    createTrail() {
        return new Trail(this);
    }

    /**
     * Create the bonus stack
     *
     * @return {BonusStack}
     */
    createBonusStack() {
        return new BonusStack(this);
    }

    /**
     * Update
     *
     * @param {Number} step
     */
    update(step) {
        if (!this.changed && this.alive) {
            this.updateAngle(step);
            this.updatePosition(step);
        }

        this.startX = this.canvas.round(this.x * this.canvas.scale - this.canvasRadius);
        this.startY = this.canvas.round(this.y * this.canvas.scale - this.canvasRadius);
        this.changed = false;
    }

    /**
     * Set position (from server)
     *
     * @param {Number} x
     * @param {Number} y
     */
    setPositionFromServer(x, y) {
        super.setPosition(x, y);

        this.changed = true;

        if (this.printing) {
            this.addPoint(x, y);
        }
    }

    /**
     * Set scale
     *
     * @param {Number} scale
     */
    setScale(scale) {
        const width = Math.ceil(this.width * scale);
        this.canvas.setDimension(width, width, scale);
        this.changed = true;
        this.canvasWidth = this.canvas.element.width;
        this.canvasRadius = this.canvas.element.width / 2;
        this.drawHead();
    }

    /**
     * Set radius
     *
     * @param {Number} radius
     */
    setRadius(radius) {
        super.setRadius(radius);
        this.updateWidth();
        this.drawHead();
    }

    /**
     * Set color
     *
     * @param {String} color
     */
    setColor(color) {
        super.setColor(color);
        this.drawHead();
    }

    /**
     * Set borderColor
     *
     * @param {String} borderColor
     */
    setBorderColor(borderColor) {
        super.setBorderColor(borderColor);
        this.drawHead();
    }

    /**
     * Set score
     *
     * @param {Number} score
     */
    setScore(score) {
        const diff = score - this.score;

        super.setScore(score);

        this.roundScore = diff;
    }

    /**
     * Die
     */
    die() {
        super.die();
        this.emit('die', this);
    }

    /**
     * Draw head
     */
    drawHead() {
        this.canvas.clear();
        this.canvas.drawCircle(
            this.canvasRadius,
            this.canvasRadius,
            this.radius * this.canvas.scale,
            this.color,
            this.borderColor
        );
    }

    /**
     * Draw arrow
     */
    drawArrow() {
        const arrowLines = [
            [
                [this.arrowSize * 0.65, this.arrowSize * 0.5],
                [this.arrowSize * 0.95, this.arrowSize * 0.5]
            ],
            [
                [this.arrowSize * 0.85, this.arrowSize * 0.4],
                [this.arrowSize * 0.95, this.arrowSize * 0.5],
                [this.arrowSize * 0.85, this.arrowSize * 0.6]
            ]
        ];

        this.arrow.clear();

        for (let i = arrowLines.length - 1; i >= 0; i--) {
            this.arrow.drawLine(arrowLines[i], (this.arrowSize * this.arrowWidth) / 100, this.color, 'round');
        }
    }

    /**
     * Update width
     */
    updateWidth() {
        this.width = this.radius * 2;
        this.setScale(this.canvas.scale);
    }

    /**
     * Destroy
     */
    destroy() {
        this.trail.clear();
        this.canvas.clear();
        this.arrow.clear();

        if (this.input) {
            this.input.detachEvents();
            this.input = null;
        }

        super.destroy();
    }

    /**
     * Clear
     */
    clear() {
        super.clear();
        this.updateWidth();
        this.drawHead();
    }

    /**
     * Set
     *
     * @param {String} property
     * @param {Object} value
     */
    set(property, value) {
        const method = `set${property[0].toUpperCase()}${property.slice(1)}`;

        if (typeof this[method] !== 'undefined') {
            this[method](value);
        } else {
            throw `Unknown setter ${method}`;
        }
    }

    /**
     * Has bonus
     *
     * @return {Boolean}
     */
    hasBonus() {
        return !this.bonusStack.bonuses.isEmpty();
    }
}

/**
 * Array width
 *
 * @type {Number}
 */
Avatar.prototype.arrowWidth = 3;

/**
 * Arrow canvas size
 *
 * @type {Number}
 */
Avatar.prototype.arrowSize = 200;
