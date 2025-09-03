import BonusEnemy from './BonusEnemy.js';

/**
 * Inverse Enemy Bonus
 */
class BonusEnemyInverse extends BonusEnemy {
    /**
     * Probability
     *
     * @type {Number}
     */
    probability = 0.8;

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
        return this.probability;
    }
}

export default BonusEnemyInverse;
