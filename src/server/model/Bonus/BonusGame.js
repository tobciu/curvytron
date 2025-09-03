import Bonus from './Bonus.js';

/**
 * Game Bonus
 */
class BonusGame extends Bonus {
    constructor(x, y) {
        super(x, y);
        this.off = this.off.bind(this);
    }

    /**
     * Affect game
     *
     * @type {String}
     */
    affect = 'game';

    /**
     * Get target
     *
     * @param {Avatar} avatar
     * @param {Game} game
     *
     * @return {Object}
     */
    getTarget(avatar, game) {
        return game;
    }

    /**
     * Apply on
     */
    on() {
        if (this.target) {
            this.target.bonusStack.add(this);
        }
    }

    /**
     * Apply off
     */
    off() {
        if (this.target) {
            this.target.bonusStack.remove(this);
        }
    }
}

export default BonusGame;
