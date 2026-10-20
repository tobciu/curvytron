import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Default Preset
 */
export class DefaultPreset extends Preset {
    /**
     * Name
     */
    name: string = 'All';

    /**
     * Bonuses
     */
    bonuses: any[] = [
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
