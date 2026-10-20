import { Preset } from '../../../shared/model/Preset.js';

/**
 * Speed Preset
 */
export class SpeedPreset extends Preset {
    constructor() {
        super();
    }
}

/**
 * Name
 *
 * @type {String}
 */
SpeedPreset.prototype.name = 'Speed of light';

/**
 * Bonuses
 *
 * @type {Array}
 */
SpeedPreset.prototype.bonuses = ['BonusSelfFast', 'BonusEnemyFast'];
