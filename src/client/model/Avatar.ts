import { Canvas } from '../core/Canvas.ts';
import { PlayerInput } from './PlayerInput.ts';
import { BaseAvatar } from '../../shared/model/BaseAvatar.ts';
import type { Player } from './Player.ts';
import { Trail } from './Trail.ts';
import { BonusStack } from './BonusStack.ts';

/**
 * Avatar
 */
export class Avatar extends BaseAvatar {
    declare player: Player;
    declare trail: Trail;
    declare bonusStack: BonusStack;
    local: any;
    canvas: Canvas;
    arrow: Canvas;
    width: number;
    canvasWidth: any;
    canvasRadius: number;
    clearWidth: any;
    startX: any;
    startY: any;
    clearX: number;
    clearY: number;
    input: any;
    changed: boolean = false;

    /**
     * Array width
     */
    arrowWidth: number = 3;

    /**
     * Arrow canvas size
     */
    arrowSize: number = 200;

    constructor(player: Player) {
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

        if (this.local) {
            this.input = new PlayerInput(this, player.getBinding());
        }

        this.drawArrow();
    }

    /**
     * Create the trail
     */
    createTrail() {
        return new Trail(this);
    }

    /**
     * Create the bonus stack
     */
    createBonusStack() {
        return new BonusStack(this);
    }

    /**
     * Update
     */
    update(step: number) {
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
     */
    setPositionFromServer(x: number, y: number) {
        super.setPosition(x, y);

        this.changed = true;

        if (this.printing) {
            this.addPoint(x, y);
        }
    }

    /**
     * Set scale
     */
    setScale(scale: number) {
        const width = Math.ceil(this.width * scale);
        this.canvas.setDimension(width, width, scale);
        this.changed = true;
        this.canvasWidth = this.canvas.element.width;
        this.canvasRadius = this.canvas.element.width / 2;
        this.drawHead();
    }

    /**
     * Set radius
     */
    setRadius(radius: number) {
        super.setRadius(radius);
        this.updateWidth();
        this.drawHead();
    }

    /**
     * Set color
     */
    setColor(color: string) {
        super.setColor(color);
        this.drawHead();
    }

    /**
     * Set borderColor
     */
    setBorderColor(borderColor: string) {
        super.setBorderColor(borderColor);
        this.drawHead();
    }

    /**
     * Set score
     */
    setScore(score: number) {
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
     */
    set(property: string, value: any) {
        const method = `set${property[0].toUpperCase()}${property.slice(1)}`;

        const self = this as unknown as Record<string, any>;

        if (typeof self[method] !== 'undefined') {
            self[method](value);
        } else {
            throw `Unknown setter ${method}`;
        }
    }

    /**
     * Has bonus
     */
    hasBonus(): boolean {
        return !this.bonusStack.bonuses.isEmpty();
    }
}
