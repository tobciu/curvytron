import { BonusLeader } from './BonusLeader.js';

/**
 * Random Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusLeaderRandom extends BonusLeader {
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

/**
 * Duration
 *
 * @type {Number}
 */
BonusLeaderRandom.prototype.duration = 7500;
