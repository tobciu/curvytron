import BonusEnemy from './BonusEnemy.js';
import BaseAvatar from '../../../shared/model/BaseAvatar.js';

/**
 * Fast Enemy Bonus
 */
class BonusEnemyFast extends BonusEnemy {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 6000;

    /**
     * Get effects
     *
     * @param {Avatar} avatar
     *
     * @return {Array}
     */
    getEffects(avatar) {
        return [['velocity', 0.75 * BaseAvatar.prototype.velocity]];
    }
}

export default BonusEnemyFast;
