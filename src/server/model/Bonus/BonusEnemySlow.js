import BonusEnemy from './BonusEnemy.js';
import BaseAvatar from '../../../shared/model/BaseAvatar.js';

/**
 * Slow Enemy Bonus
 */
class BonusEnemySlow extends BonusEnemy {
    /**
     * Get effects
     *
     * @param {Avatar} avatar
     *
     * @return {Array}
     */
    getEffects(avatar) {
        return [['velocity', -BaseAvatar.prototype.velocity / 2]];
    }
}

export default BonusEnemySlow;
