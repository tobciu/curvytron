import Preset from '../../../shared/model/Preset.js';

/**
 * Solo Preset
 */
export default class SoloPreset extends Preset {
    constructor() {
        super();

        this.name = 'Solo';
        this.bonuses = [
            'BonusSelfSmall',
            'BonusSelfSlow',
            'BonusSelfFast',
            'BonusSelfMaster'
        ];
    }
}
