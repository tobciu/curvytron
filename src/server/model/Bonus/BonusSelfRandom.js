import { BonusSelf } from './BonusSelf.js';

/**
 * Random Self Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusSelfRandom extends BonusSelf {
    /**
     * Duration
     *
     * @type {Number}
     */
    duration = 7500;

    constructor(x, y) {
        super(x, y);
    }

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
            ['angularVelocityBase', Math.PI / 4]
        ];
    }
}
