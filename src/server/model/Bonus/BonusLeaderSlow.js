import { BonusLeader } from './BonusLeader.js';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.js';

/**
 * Slow Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusLeaderSlow extends BonusLeader {
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
        return [['velocity', -BaseAvatar.prototype.velocity / 2]];
    }
}
