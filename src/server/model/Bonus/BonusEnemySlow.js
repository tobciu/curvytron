import { BonusEnemy } from './BonusEnemy.js';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.js';

/**
 * Slow Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusEnemySlow extends BonusEnemy {
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
