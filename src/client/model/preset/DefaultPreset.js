import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Default Preset
 */
export class DefaultPreset extends Preset {
    /**
     * Name
     *
     * @type {String}
     */
    name = 'All';

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
        'BonusEnemySlow',
        'BonusEnemyFast',
        'BonusEnemyBig',
        'BonusEnemyInverse',
        'BonusEnemyStraightAngle',
        'BonusGameBorderless',
        'BonusAllColor',
        'BonusGameClear'
    ];

    constructor() {
        super();
    }
}
