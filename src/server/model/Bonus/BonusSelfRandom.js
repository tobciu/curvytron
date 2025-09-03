import BonusSelf from './BonusSelf.js';

/**
 * Random Self Bonus
 */
class BonusSelfRandom extends BonusSelf {
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

export default BonusSelfRandom;
