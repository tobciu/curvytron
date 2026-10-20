import { BonusEnemy } from './BonusEnemy.js';

/**
 * Random Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusEnemyRandom extends BonusEnemy {
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
        return [
            ['directionInLoop', false],
            ['angularVelocityBase', Math.PI / 4]
        ];
    }
}
