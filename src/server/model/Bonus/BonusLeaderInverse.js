import { BonusLeader } from './BonusLeader.js';

/**
 * Inverse Leader Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusLeaderInverse extends BonusLeader {
    /**
     * Probability
     *
     * @type {Number}
     */
    static probability = 0.8;

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
    static getProbability(game) {
        return BonusLeader.probability * BonusLeaderInverse.probability;
    }
}
