import { Preset } from '../../../shared/model/Preset.js';

/**
 * Size Preset
 */
export class SizePreset extends Preset {
    constructor() {
        super();
    }
}

/**
 * Name
 *
 * @type {String}
 */
SizePreset.prototype.name = 'Super size me';

/**
 * Bonuses
 *
 * @type {Array}
 */
SizePreset.prototype.bonuses = ['BonusEnemyBig'];
