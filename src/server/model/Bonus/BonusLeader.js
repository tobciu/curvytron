import Bonus from './Bonus.js';

/**
 * Leader Bonus
 */
class BonusLeader extends Bonus {
    constructor(x, y) {
        super(x, y);
        this.off = this.off.bind(this);
    }

    /**
     * Affect leader
     *
     * @type {String}
     */
    affect = 'leader';

    /**
     * Get target
     *
     * @param {Avatar} avatar
     * @param {Game} game
     *
     * @return {Object}
     */
    getTarget(avatar, game) {
        const sortAvatars = game.sortAvatars(game.avatars.filter(function () {
            return this.alive && !this.equal(avatar);
        }));
        const leader = sortAvatars.getFirst();
        if (leader !== null) {
            return sortAvatars.filter(function () {
                return this.score === leader.score;
            }).items;
        }
        return [];
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

    /**
     * Probability
     *
     * @type {Number}
     */
    probability = 0.5;

    /**
     * Get probability
     *
     * @param {Game} game
     *
     * @return {Number}
     */
    getProbability(game) {
        const leader = game.sortAvatars(game.avatars.filter(function () {
            return this.alive;
        })).getFirst();
        if (leader === null) {
            return 0;
        } else if (leader.score === 0) {
            return 0;
        }
        return this.probability;
    }
}

export default BonusLeader;
