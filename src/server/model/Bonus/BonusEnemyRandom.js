import BonusEnemy from './BonusEnemy.js';

/**
 * Random Enemy Bonus
 */
class BonusEnemyRandom extends BonusEnemy {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 7500;

    /**
     * Get effects
     *
     * @param {Avatar} avatar
     *
     * @return {Array}
     */
    getEffects(avatar) {
        return [['directionInLoop', false], ['angular_velocity_base', Math.PI / 4]];
    }
}

export default BonusEnemyRandom;
