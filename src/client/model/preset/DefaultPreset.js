import Preset from '../../../shared/model/Preset.js';

/**
 * Default Preset
 */
export default class DefaultPreset extends Preset {
    constructor() {
        super();

        this.name = 'All';
        this.bonuses = [
            'BonusSelfSmall',
            'BonusSelfSlow',
            'BonusSelfFast',
            'BonusSelfMaster',
            'BonusEnemySlow',
            'BonusEnemyFast',
            'BonusEnemyBig',
            'BonusEnemyInverse',
            'BonusEnemyStraightAngle',
            'BonusGameBorderless',
            'BonusAllColor',
            'BonusGameClear'
        ];
    }
}
