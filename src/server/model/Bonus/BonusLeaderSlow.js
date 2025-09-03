import BonusLeader from './BonusLeader.js';
import BaseAvatar from '../../../shared/model/BaseAvatar.js';

/**
 * Slow Leader Bonus
 */
class BonusLeaderSlow extends BonusLeader {
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

export default BonusLeaderSlow;
