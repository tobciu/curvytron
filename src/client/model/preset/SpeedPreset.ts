import { presetBonuses } from '../../../shared/bonuses.ts';
import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Speed Preset
 */
export class SpeedPreset extends Preset {
    /**
     * Name
     */
    override name: string = 'Speed of light';

    /**
     * Bonuses
     */
    override bonuses: string[] = presetBonuses('speed');

    constructor() {
        super();
    }
}
