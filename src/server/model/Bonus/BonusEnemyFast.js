import { BonusEnemy } from './BonusEnemy.js';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.js';

/**
 * Fast Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusEnemyFast extends BonusEnemy {
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
BonusEnemyFast.prototype.duration = 6000;
