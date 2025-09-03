import BonusLeader from './BonusLeader.js';

/**
 * Random Leader Bonus
 */
class BonusLeaderRandom extends BonusLeader {
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
        return [['directionInLoop', false], ['angularVelocityBase', Math.PI / 4]];
    }
}

export default BonusLeaderRandom;
