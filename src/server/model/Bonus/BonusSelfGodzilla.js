import { BonusSelf } from './BonusSelf.js';

/**
 * Godzilla Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusSelfGodzilla extends BonusSelf {
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
            ['invincible', true],
            ['printing', 100],
            ['radius', 10],
            ['velocity', 6]
        ];
    }
}
