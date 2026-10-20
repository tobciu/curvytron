import { Preset } from '../../../shared/model/Preset.js';

/**
 * Default Preset
 */
export class RandomPreset extends Preset {
    constructor() {
        super();
    }

    calculateRandom() {
        RandomPreset.prototype.bonuses = RandomPreset.prototype.allBonuses
            .sort(function () {
                return 0.5 - Math.random();
            })
            .slice(0, Math.floor(Math.random() * (RandomPreset.prototype.allBonuses.length - 1)));
    }
}

/**
 * Name
 *
 * @type {String}
 */
RandomPreset.prototype.name = 'Random';

/**
 * Bonuses
 *
 * @type {Array}
 */
Preset.prototype.bonuses = [];

/**
 * All bonuses
 *
 * @type {Array}
 */
RandomPreset.prototype.allBonuses = [
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
