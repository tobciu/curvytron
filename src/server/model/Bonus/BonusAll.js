import Bonus from './Bonus.js';

/**
 * All Bonus
 */
class BonusAll extends Bonus {
    constructor(x, y) {
        super(x, y);
        this.off = this.off.bind(this);
    }

    /**
     * Affect all
     *
     * @type {String}
     */
    affect = 'all';

    /**
     * Get target
     *
     * @param {Avatar} avatar
     * @param {Game} game
     *
     * @return {Object}
     */
    getTarget(avatar, game) {
        return game.avatars.filter(function () { return this.alive; }).items;
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
     * Apply off
     */
    off() {
        for (let i = this.target.length - 1; i >= 0; i--) {
            this.target[i].bonusStack.remove(this);
        }
    }
}

export default BonusAll;
