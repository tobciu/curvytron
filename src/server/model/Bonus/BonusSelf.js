import BaseBonus from '../../../shared/model/BaseBonus.js';

/**
 * Self Bonus
 */
class BonusSelf extends BaseBonus {
    constructor(x, y) {
        super(x, y);

        this.off = this.off.bind(this);
    }

    /**
     * Affect self
     *
     * @type {String}
     */
    affect = 'self';

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

export default BonusSelf;
