import { BonusEnemy } from './BonusEnemy.js';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.ts';

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
        return [['velocity', -BaseAvatar.defaults.velocity / 2]];
    }
}
