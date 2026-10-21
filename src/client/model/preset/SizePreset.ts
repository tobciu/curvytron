import { presetBonuses } from '../../../shared/bonuses.ts';
import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Size Preset
 */
export class SizePreset extends Preset {
    /**
     * Name
     */
    override name: string = 'Super size me';

    /**
     * Bonuses
     */
    override bonuses: string[] = presetBonuses('size');

    constructor() {
        super();
    }
}
