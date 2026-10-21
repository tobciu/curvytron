import { presetBonuses } from '../../../shared/bonuses.ts';
import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Solo Preset
 */
export class SoloPreset extends Preset {
    /**
     * Name
     */
    override name: string = 'Solo';

    /**
     * Bonuses
     */
    override bonuses: string[] = presetBonuses('solo');

    constructor() {
        super();
    }
}
