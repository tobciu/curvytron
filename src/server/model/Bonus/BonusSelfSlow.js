import BonusSelf from './BonusSelf.js';
import BaseAvatar from '../../../shared/model/BaseAvatar.js';

/**
 * Slow Bonus
 */
class BonusSelfSlow extends BonusSelf {
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

export default BonusSelfSlow;
