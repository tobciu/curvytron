import BonusGame from './BonusGame.js';

/**
 * Master Bonus
 */
class BonusGameClear extends BonusGame {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 0;

    /**
     * Get probability
     *
     * @param {Game} game
     *
     * @return {Number}
     */
    getProbability(game) {
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

export default BonusGameClear;
