import { Preset } from '../../../shared/model/Preset.js';

/**
 * Solo Preset
 */
export class SoloPreset extends Preset {
    constructor() {
        super();
    }
}

/**
 * Name
 *
 * @type {String}
 */
SoloPreset.prototype.name = 'Solo';

/**
 * Bonuses
 *
 * @type {Array}
 */
SoloPreset.prototype.bonuses = [
    'BonusSelfSmall',
    'BonusSelfSlow',
    'BonusSelfFast',
    'BonusSelfMaster',
    'BonusGameBorderless',
    'BonusGameClear'
];
