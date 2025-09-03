/**
 * Preset
 */
export default class Preset {
    constructor() {
        this.bonuses = [];
    }

    /**
     * Has bonus
     *
     * @param {String} bonus
     *
     * @return {Boolean}
     */
    hasBonus(bonus) {
        return this.bonuses.indexOf(bonus) > -1;
    }
}
