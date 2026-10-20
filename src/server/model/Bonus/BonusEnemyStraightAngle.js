import { BonusEnemy } from './BonusEnemy.js';

/**
 * Inverse Enemy Straight Angle
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusEnemyStraightAngle extends BonusEnemy {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 5000;

    /**
     * Probability
     *
     * @type {Number}
     */
    static probability = 0.6;

    constructor(x, y) {
        super(x, y);
    }

    /**
     * Get effects
     *
     * @param {Avatar} avatar
     *
     * @return {Array}
     */
    getEffects(avatar) {
        return [
            ['directionInLoop', false],
            ['angularVelocityBase', Math.PI / 2]
        ];
    }

    /**
     * Get probability
     *
     * @param {Game} game
     *
     * @return {Number}
     */
    static getProbability(game) {
        return BonusEnemyStraightAngle.probability;
    }
}
