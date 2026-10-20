import { Preset } from '../../../shared/model/Preset.js';

/**
 * Custom Preset
 */
export class CustomPreset extends Preset {
    constructor() {
        super();
    }
}

/**
 * Name
 *
 * @type {String}
 */
CustomPreset.prototype.name = 'Custom';
