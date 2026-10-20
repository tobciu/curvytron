/**
 * Preset
 */
export class Preset {
    /**
     * Bonuses
     *
     * @type {Array}
     */
    bonuses = [];

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
