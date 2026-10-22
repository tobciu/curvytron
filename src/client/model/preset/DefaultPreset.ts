import { bonusNames } from '../../../shared/bonuses.ts';
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
     * Bonuses: every bonus of the game
     */
    override bonuses: string[] = [...bonusNames];

    constructor() {
        super();
    }
}
