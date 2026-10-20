import { BonusEnemy } from './BonusEnemy.js';

/**
 * Inverse Enemy Straight Angle
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusEnemyStraightAngle extends BonusEnemy {
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
    getProbability(game) {
        return BonusEnemyStraightAngle.prototype.probability;
    }
}

/**
 * Duration
 *
 * @type {Number}
 */
BonusEnemyStraightAngle.prototype.duration = 5000;

/**
 * Probability
 *
 * @type {Number}
 */
BonusEnemyStraightAngle.prototype.probability = 0.6;
