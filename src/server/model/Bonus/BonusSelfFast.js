import BonusSelf from './BonusSelf.js';
import BaseAvatar from '../../../shared/model/BaseAvatar.js';

/**
 * Fast Bonus
 */
class BonusSelfFast extends BonusSelf {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 4000;

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

export default BonusSelfFast;
