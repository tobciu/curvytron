import { Preset } from '../../../shared/model/Preset.js';

/**
 * Default Preset
 */
export class RandomPreset extends Preset {
    /**
     * Name
     *
     * @type {String}
     */
    name = 'Random';

    /**
     * All bonuses
     *
     * @type {Array}
     */
    allBonuses = [
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
