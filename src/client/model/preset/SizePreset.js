import Preset from '../../../shared/model/Preset.js';

/**
 * Size Preset
 */
export default class SizePreset extends Preset {
    constructor() {
        super();

        this.name = 'Size';
        this.bonuses = [
            'BonusSelfSmall',
            'BonusEnemyBig'
        ];
    }
}
