import { BonusGame } from './BonusGame.js';

/**
 * Borderless Game Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusGameBorderless extends BonusGame {
    constructor(x, y) {
        super(x, y);
    }

    /**
     * Get effects
     *
     * @param {Game} game
     *
     * @return {Array}
     */
    getEffects(game) {
        return [['borderless', true]];
    }

    /**
     * Get probability
     *
     * @param {Game} game
     *
     * @return {Number}
     */
    getProbability(game) {
        return BonusGameBorderless.prototype.probability;
    }
}

/**
 * Duration
 *
 * @type {Number}
 */
BonusGameBorderless.prototype.duration = 10000;

/**
 * Probability
 *
 * @type {Number}
 */
BonusGameBorderless.prototype.probability = 0.8;
