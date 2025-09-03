import EventEmitter from 'tom32i-event-emitter.js';

/**
 * BaseBonus
 */
class BaseBonus extends EventEmitter {
    constructor(x, y) {
        super();

        this.x = x;
        this.y = y;
        this.id = null;
    }

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
    radius = 3;

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
    probability = 1;

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

export default BaseBonus;
