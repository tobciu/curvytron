import { BonusSelf } from './BonusSelf.js';

/**
 * Small Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusSelfSmall extends BonusSelf {
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
        return [['radius', -1]];
    }
}

/**
 * Duration
 *
 * @type {Number}
 */
BonusSelfSmall.prototype.duration = 7500;
