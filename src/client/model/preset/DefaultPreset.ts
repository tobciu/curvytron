import { presetBonuses } from '../../../shared/bonuses.ts';
import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Default Preset
 */
export class DefaultPreset extends Preset {
    /**
     * Name
     */
    name: string = 'All';

    /**
     * Bonuses
     */
    bonuses: string[] = presetBonuses('all');

    constructor() {
        super();
    }
}
