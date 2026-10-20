import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Default Preset
 */
export class RandomPreset extends Preset {
    /**
     * Name
     */
    name: string = 'Random';

    /**
     * All bonuses
     */
    allBonuses: any[] = [
        'BonusSelfFast',
        'BonusEnemyFast',
        'BonusSelfSlow',
        'BonusEnemySlow',
        'BonusGameBorderless',
        'BonusSelfMaster',
        'BonusEnemyBig',
        'BonusAllColor',
        'BonusEnemyInverse',
        'BonusSelfSmall',
        'BonusGameClear',
        'BonusEnemyStraightAngle',
        'BonusSelfRandom',
        'BonusLeaderRandom',
        'BonusEnemyRandom',
        'BonusLeaderFast',
        'BonusLeaderInverse',
        'BonusLeaderSlow',
        'BonusSelfBorderless'
    ];

    constructor() {
        super();
    }

    calculateRandom() {
        this.bonuses = [...this.allBonuses]
            .sort(function () {
                return 0.5 - Math.random();
            })
            .slice(0, Math.floor(Math.random() * (this.allBonuses.length - 1)));
    }
}
