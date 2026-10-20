import { BonusEnemy } from './BonusEnemy.js';

/**
 * Big Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusEnemyBig extends BonusEnemy {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 7500;

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
        return [['radius', 1]];
    }
}
