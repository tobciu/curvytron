import { Preset } from '../../../shared/model/Preset.js';

/**
 * Solo Preset
 */
export class SoloPreset extends Preset {
    /**
     * Name
     *
     * @type {String}
     */
    name = 'Solo';

    /**
     * Bonuses
     *
     * @type {Array}
     */
    bonuses = [
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
