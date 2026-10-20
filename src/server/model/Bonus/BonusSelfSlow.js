import { BonusSelf } from './BonusSelf.js';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.js';

/**
 * Slow Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusSelfSlow extends BonusSelf {
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
        return [['velocity', -BaseAvatar.defaults.velocity / 2]];
    }
}
