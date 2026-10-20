import { EventEmitter } from '#event-emitter';

/**
 * BaseBonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BaseBonus extends EventEmitter {
    /**
     * Target affected
     *
     * @type {String}
     */
    affect = 'self';

    /**
     * Radius
     *
     * @type {Number}
     */
    static radius = 3;

    radius = BaseBonus.radius;

    /**
     * Effect duration
     *
     * @type {Number}
     */
    duration = 5000;

    /**
     * Probability to appear
     *
     * @type {Number}
     */
    static probability = 1;

    constructor(x, y) {
        super();

        this.x = x;
        this.y = y;
        this.id = null;
    }

    /**
     * Clear
     *
     * @param {Array} point
     */
    clear() {}

    /**
     * Apply to target(s)
     *
     * @param {Avatar} avatar
     * @param {Game} game
     *
     * @return {Number}
     */
    applyTo(avatar, game) {}

    /**
     * Get probability
     *
     * @param {Game} game
     *
     * @return {Number}
     */
    static getProbability(game) {
        return BaseBonus.probability;
    }
}
