import BonusSelf from './BonusSelf.js';

/**
 * Master Bonus
 */
class BonusSelfMaster extends BonusSelf {
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
        return [
            ['invincible', true],
            ['printing', -1]
        ];
    }
}

export default BonusSelfMaster;
