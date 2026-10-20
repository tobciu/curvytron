import { BonusEnemy } from './BonusEnemy.js';

/**
 * Inverse Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusEnemyInverse extends BonusEnemy {
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
        return [['inverse', 1]];
    }

    /**
     * Get probability
     *
     * @param {Game} game
     *
     * @return {Number}
     */
    getProbability(game) {
        return BonusEnemyInverse.prototype.probability;
    }
}

/**
 * Probability
 *
 * @type {Number}
 */
BonusEnemyInverse.prototype.probability = 0.8;
