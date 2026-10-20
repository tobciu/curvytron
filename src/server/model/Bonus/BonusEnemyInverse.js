import { BonusEnemy } from './BonusEnemy.js';

/**
 * Inverse Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusEnemyInverse extends BonusEnemy {
    /**
     * Probability
     *
     * @type {Number}
     */
    static probability = 0.8;

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
    static getProbability(game) {
        return BonusEnemyInverse.probability;
    }
}
