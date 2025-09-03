import Preset from '../../../shared/model/Preset.js';

/**
 * Speed Preset
 */
export default class SpeedPreset extends Preset {
    constructor() {
        super();

        this.name = 'Speed';
        this.bonuses = [
            'BonusSelfSlow',
            'BonusSelfFast',
            'BonusEnemySlow',
            'BonusEnemyFast'
        ];
    }
}
