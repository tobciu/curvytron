import { Bonus } from './Bonus.js';

/**
 * All Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusAll extends Bonus {
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
        return game.avatars.filter(function () {
            return this.alive;
        }).items;
    }

    /**
     * Apply on
     */
    on() {
        for (let i = this.target.length - 1; i >= 0; i--) {
            this.target[i].bonusStack.add(this);
        }
    }

    /**
     * Apply on
     */
    off() {
        for (let i = this.target.length - 1; i >= 0; i--) {
            this.target[i].bonusStack.remove(this);
        }
    }
}

/**
 * Affect all
 *
 * @type {String}
 */
BonusAll.prototype.affect = 'all';
