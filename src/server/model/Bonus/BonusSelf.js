import { Bonus } from './Bonus.js';

/**
 * Self Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusSelf extends Bonus {
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
        return avatar.alive ? avatar : null;
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

/**
 * Affect self
 *
 * @type {String}
 */
BonusSelf.prototype.affect = 'self';
