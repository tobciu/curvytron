import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Speed Preset
 */
export class SpeedPreset extends Preset {
    /**
     * Name
     */
    name: string = 'Speed of light';

    /**
     * Bonuses
     */
    bonuses: any[] = ['BonusSelfFast', 'BonusEnemyFast'];

    constructor() {
        super();
    }
}
