import { EventEmitter } from '#event-emitter';

/**
 * BaseBonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BaseBonus extends EventEmitter {
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
    getProbability(game) {
        return BaseBonus.prototype.probability;
    }
}

/**
 * Target affected
 *
 * @type {String}
 */
BaseBonus.prototype.affect = 'self';

/**
 * Radius
 *
 * @type {Number}
 */
BaseBonus.prototype.radius = 3;

/**
 * Effect duration
 *
 * @type {Number}
 */
BaseBonus.prototype.duration = 5000;

/**
 * Probability to appear
 *
 * @type {Number}
 */
BaseBonus.prototype.probability = 1;
