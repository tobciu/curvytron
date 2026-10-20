import { Preset } from '../../../shared/model/Preset.js';

/**
 * Empty Preset
 */
export class EmptyPreset extends Preset {
    constructor() {
        super();
    }
}

/**
 * Name
 *
 * @type {String}
 */
EmptyPreset.prototype.name = 'No bonuses';
