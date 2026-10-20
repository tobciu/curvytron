/**
 * Preset
 */
export class Preset {
    /**
     * Bonuses
     */
    bonuses: string[] = [];

    name: string = '';

    /** Only presets that pick their bonuses randomly */
    calculateRandom?(): void;

    /**
     * Has onus
     */
    hasBonus(bonus: string): boolean {
        return this.bonuses.indexOf(bonus) > -1;
    }
}
