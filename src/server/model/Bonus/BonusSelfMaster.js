import { BonusSelf } from './BonusSelf.js';

/**
 * Master Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusSelfMaster extends BonusSelf {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 7500;

    constructor(x, y) {
        super(x, y);
    }

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
