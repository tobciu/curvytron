import { BonusSelf } from './BonusSelf.js';

/**
 * Random Self Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusSelfRandom extends BonusSelf {
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

/**
 * Duration
 *
 * @type {Number}
 */
BonusSelfRandom.prototype.duration = 7500;
