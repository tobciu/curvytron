import { BonusSelf } from './BonusSelf.js';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.js';

/**
 * Fast Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusSelfFast extends BonusSelf {
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
        return [['velocity', 0.75 * BaseAvatar.prototype.velocity]];
    }
}

/**
 * Duration
 *
 * @type {Number}
 */
BonusSelfFast.prototype.duration = 4000;
