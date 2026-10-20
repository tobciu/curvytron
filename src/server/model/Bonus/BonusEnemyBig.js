import { BonusEnemy } from './BonusEnemy.js';

/**
 * Big Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusEnemyBig extends BonusEnemy {
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

/**
 * Duration
 *
 * @type {Number}
 */
BonusEnemyBig.prototype.duration = 7500;
