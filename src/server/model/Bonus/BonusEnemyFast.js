import { BonusEnemy } from './BonusEnemy.js';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.ts';

/**
 * Fast Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusEnemyFast extends BonusEnemy {
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
