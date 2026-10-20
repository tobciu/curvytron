import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Solo Preset
 */
export class SoloPreset extends Preset {
    /**
     * Name
     */
    name: string = 'Solo';

    /**
     * Bonuses
     */
    bonuses: any[] = [
        'BonusSelfSmall',
        'BonusSelfSlow',
        'BonusSelfFast',
        'BonusSelfMaster',
        'BonusGameBorderless',
        'BonusGameClear'
    ];

    constructor() {
        super();
    }
}
