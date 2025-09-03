import BonusEnemy from './BonusEnemy.js';

/**
 * Inverse Enemy Straight Angle
 */
class BonusEnemyStraightAngle extends BonusEnemy {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 5000;

    /**
     * Probability
     *
     * @type {Number}
     */
    probability = 0.6;

    /**
     * Get effects
     *
     * @param {Avatar} avatar
     *
     * @return {Array}
     */
    getEffects(avatar) {
        return [
            ['directionInLoop', false],
            ['angularVelocityBase', Math.PI / 2]
        ];
    }

    /**
     * Get probability
     *
     * @param {Game} game
     *
     * @return {Number}
     */
    getProbability(game) {
        return this.probability;
    }
}

export default BonusEnemyStraightAngle;
