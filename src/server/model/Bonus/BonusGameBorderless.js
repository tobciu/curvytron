import BonusGame from './BonusGame.js';

/**
 * Borderless Game Bonus
 */
class BonusGameBorderless extends BonusGame {
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
    probability = 0.8;

    /**
     * Get effects
     *
     * @param {Game} game
     *
     * @return {Array}
     */
    getEffects(game) {
        return [
            ['borderless', true]
        ];
    }

    /**
     * Get probability
     *
     * @param {Game} game
     *
     * @return {Number}
     */
    getProbability(game) {
        return this.probability;
    }
}

export default BonusGameBorderless;
