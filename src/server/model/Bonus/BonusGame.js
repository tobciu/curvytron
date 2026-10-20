import { Bonus } from './Bonus.js';

/**
 * Game Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusGame extends Bonus {
    /**
     * Affect game
     *
     * @type {String}
     */
    affect = 'game';

    constructor(x, y) {
        super(x, y);

        this.off = this.off.bind(this);
    }

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
     * Apply on
     */
    off() {
        if (this.target) {
            this.target.bonusStack.remove(this);
        }
    }
}
