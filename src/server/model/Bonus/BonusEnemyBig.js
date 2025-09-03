import BonusEnemy from './BonusEnemy.js';

/**
 * Big Enemy Bonus
 */
class BonusEnemyBig extends BonusEnemy {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 7500;

    /**
     * Get effects
     *
     * @param {Avatar} avatar
     *
     * @return {Array}
     */
    getEffects(avatar) {
        return [['radius', 1]];
    }
}

export default BonusEnemyBig;
