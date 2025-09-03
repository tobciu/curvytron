import BonusLeader from './BonusLeader.js';

/**
 * Inverse Leader Bonus
 */
class BonusLeaderInverse extends BonusLeader {
    /**
     * Probability
     *
     * @type {Number}
     */
    probability = 0.8;

    /**
     * Get effects
     *
     * @param {Avatar} avatar
     *
     * @return {Array}
     */
    getEffects(avatar) {
        return [['inverse', 1]];
    }

    /**
     * Get probability
     *
     * @param {Game} game
     *
     * @return {Number}
     */
    getProbability(game) {
        return super.getProbability(game) * this.probability;
    }
}

export default BonusLeaderInverse;
