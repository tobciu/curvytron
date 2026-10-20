import { Bonus } from './Bonus.js';

/**
 * Enemy Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusEnemy extends Bonus {
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
            return this.alive && !this.equal(avatar);
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
 * Affect enemy
 *
 * @type {String}
 */
BonusEnemy.prototype.affect = 'enemy';
