import { presetBonuses } from '../../../shared/bonuses.ts';
import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Default Preset
 */
export class DefaultPreset extends Preset {
    /**
     * Name
     */
    override name: string = 'All';

    /**
     * Bonuses
     */
    override bonuses: string[] = presetBonuses('all');

    constructor() {
        super();
    }
}
