/**
 * Preset
 */
export class Preset {
    /**
     * Bonuses
     */
    bonuses: string[] = [];

    /**
     * Has onus
     */
    hasBonus(bonus: string): boolean {
        return this.bonuses.indexOf(bonus) > -1;
    }
}
