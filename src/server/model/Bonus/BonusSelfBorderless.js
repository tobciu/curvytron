import BonusSelf from './BonusSelf.js';

/**
 * Ghost Bonus
 */
class BonusSelfBorderless extends BonusSelf {
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
            ['ghost', true]
        ];
    }
}

export default BonusSelfBorderless;
