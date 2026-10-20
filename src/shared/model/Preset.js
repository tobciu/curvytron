/**
 * Preset
 */
export class Preset {
    /**
     * Has onus
     *
     * @param {String} bonus
     *
     * @return {Boolean}
     */
    hasBonus(bonus) {
        return this.bonuses.indexOf(bonus) > -1;
    }
}

/**
 * Bonuses
 *
 * @type {Array}
 */
Preset.prototype.bonuses = [];
