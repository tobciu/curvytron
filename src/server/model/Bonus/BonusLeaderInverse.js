import { BonusLeader } from './BonusLeader.js';

/**
 * Inverse Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusLeaderInverse extends BonusLeader {
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
        return [['inverse', 1]];
    }

    /**
     * Get probability
     *
     * @param {Game} game
     *
     * @return {Number}
     */
    getProbability(game) {
        return BonusLeader.prototype.probability * BonusLeaderInverse.prototype.probability;
    }
}

/**
 * Probability
 *
 * @type {Number}
 */
BonusLeaderInverse.prototype.probability = 0.8;
