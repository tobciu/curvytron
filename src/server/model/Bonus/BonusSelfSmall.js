import BonusSelf from './BonusSelf.js';

/**
 * Small Bonus
 */
class BonusSelfSmall extends BonusSelf {
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
        return [['radius', -1]];
    }
}

export default BonusSelfSmall;
