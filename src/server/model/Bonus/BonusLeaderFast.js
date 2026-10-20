import { BonusLeader } from './BonusLeader.js';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.js';

/**
 * Fast Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusLeaderFast extends BonusLeader {
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
BonusLeaderFast.prototype.duration = 6000;
