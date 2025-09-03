import BaseAvatar from '../../shared/model/BaseAvatar.js';
import Canvas from '../core/Canvas.js';
import PlayerInput from './PlayerInput.js';

/**
 * Avatar
 */
export default class Avatar extends BaseAvatar {
    constructor(player) {
        super(player);

        this.local = player.local;
        this.canvas = new Canvas(100, 100);
        this.arrowWidth = 3;
        this.arrowSize = 200;
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

    update(step) {
        if (!this.changed && this.alive) {
            this.updateAngle(step);
            this.updatePosition(step);
        }
        this.startX = this.canvas.round(this.x * this.canvas.scale - this.canvasRadius);
        this.startY = this.canvas.round(this.y * this.canvas.scale - this.canvasRadius);
        this.changed = false;
    }

    setPositionFromServer(x, y) {
        super.setPosition(x, y);
        this.changed = true;
        if (this.printing) {
            this.addPoint(x, y);
        }
    }

    setScale(scale) {
        const width = Math.ceil(this.width * scale);
        this.canvas.setDimension(width, width, scale);
        this.changed = true;
        this.canvasWidth = this.canvas.element.width;
        this.canvasRadius = this.canvas.element.width / 2;
        this.drawHead();
    }

    setRadius(radius) {
        super.setRadius(radius);
        this.updateWidth();
        this.drawHead();
    }

    setColor(color) {
        super.setColor(color);
        this.drawHead();
    }

    setBorderColor(borderColor) {
        super.setBorderColor(borderColor);
        this.drawHead();
    }

    setScore(score) {
        const diff = score - this.score;
        super.setScore(score);
        this.roundScore = diff;
    }

    die() {
        if (this.invincible) {
            return;
        }
        super.die();
        this.emit('die', this);
    }

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

    drawArrow() {
        const arrowLines = [
            [[this.arrowSize * 0.65, this.arrowSize * 0.5], [this.arrowSize * 0.95, this.arrowSize * 0.5]],
            [[this.arrowSize * 0.85, this.arrowSize * 0.4], [this.arrowSize * 0.95, this.arrowSize * 0.5], [this.arrowSize * 0.85, this.arrowSize * 0.6]]
        ];
        this.arrow.clear();
        for (let i = arrowLines.length - 1; i >= 0; i--) {
            this.arrow.drawLine(arrowLines[i], this.arrowSize * this.arrowWidth / 100, this.color, 'round');
        }
    }

    updateWidth() {
        this.width = this.radius * 2;
        this.setScale(this.canvas.scale);
    }

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

    clear() {
        super.clear();
        this.updateWidth();
        this.drawHead();
    }

    set(property, value) {
        const method = 'set' + property[0].toUpperCase() + property.slice(1);
        if (typeof this[method] !== 'undefined') {
            this[method](value);
        } else {
            throw new Error('Unknown setter ' + method);
        }
    }

    hasBonus() {
        return !this.bonusStack.bonuses.isEmpty();
    }

    isColliding(bonus) {
        const dx = this.x - bonus.x;
        const dy = this.y - bonus.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= this.radius + bonus.radius;
    }
}
