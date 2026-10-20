import { BonusSelf } from './BonusSelf.js';

/**
 * Ghost Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusSelfBorderless extends BonusSelf {
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
        return [['ghost', true]];
    }
}
