import { BonusLeader } from './BonusLeader.js';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.ts';

/**
 * Fast Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusLeaderFast extends BonusLeader {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 6000;

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
