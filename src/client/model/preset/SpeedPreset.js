import { Preset } from '../../../shared/model/Preset.js';

/**
 * Speed Preset
 */
export class SpeedPreset extends Preset {
    /**
     * Name
     *
     * @type {String}
     */
    name = 'Speed of light';

    /**
     * Bonuses
     *
     * @type {Array}
     */
    bonuses = ['BonusSelfFast', 'BonusEnemyFast'];

    constructor() {
        super();
    }
}
