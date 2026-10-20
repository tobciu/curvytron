import { Preset } from '../../../shared/model/Preset.js';

/**
 * Default Preset
 */
export class DefaultPreset extends Preset {
    constructor() {
        super();
    }
}

/**
 * Name
 *
 * @type {String}
 */
DefaultPreset.prototype.name = 'All';

/**
 * Bonuses
 *
 * @type {Array}
 */
DefaultPreset.prototype.bonuses = [
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
