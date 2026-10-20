import { BonusGame } from './BonusGame.js';

/**
 * Master Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusGameClear extends BonusGame {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 0;

    constructor(x, y) {
        super(x, y);
    }

    /**
     * Get probability
     *
     * @param {Game} game
     *
     * @return {Number}
     */
    static getProbability(game) {
        const ratio = 1 - game.getAliveAvatars().count() / game.getPresentAvatars().count();

        return Math.round(ratio * 10) / 10;
    }

    /**
     * Apply on
     */
    on() {
        this.target.clearTrails();
    }
}
