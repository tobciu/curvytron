import BonusLeader from './BonusLeader.js';
import BaseAvatar from '../../../shared/model/BaseAvatar.js';

/**
 * Fast Leader Bonus
 */
class BonusLeaderFast extends BonusLeader {
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

export default BonusLeaderFast;
