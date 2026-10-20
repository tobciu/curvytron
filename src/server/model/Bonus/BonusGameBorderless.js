import { BonusGame } from './BonusGame.js';

/**
 * Borderless Game Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusGameBorderless extends BonusGame {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 10000;

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
    static getProbability(game) {
        return BonusGameBorderless.probability;
    }
}
