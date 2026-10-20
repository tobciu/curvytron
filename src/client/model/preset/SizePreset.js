import { Preset } from '../../../shared/model/Preset.js';

/**
 * Size Preset
 */
export class SizePreset extends Preset {
    /**
     * Name
     *
     * @type {String}
     */
    name = 'Super size me';

    /**
     * Bonuses
     *
     * @type {Array}
     */
    bonuses = ['BonusEnemyBig'];

    constructor() {
        super();
    }
}
