import { BonusSelf } from './BonusSelf.js';

/**
 * Ghost Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusSelfBorderless extends BonusSelf {
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

/**
 * Duration
 *
 * @type {Number}
 */
BonusSelfBorderless.prototype.duration = 7500;
