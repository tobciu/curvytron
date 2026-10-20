import { BonusSelf } from './BonusSelf.js';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.ts';

/**
 * Fast Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusSelfFast extends BonusSelf {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 4000;

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
        return [['velocity', 0.75 * BaseAvatar.defaults.velocity]];
    }
}
