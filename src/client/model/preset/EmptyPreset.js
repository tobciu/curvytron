import { Preset } from '../../../shared/model/Preset.js';

/**
 * Empty Preset
 */
export class EmptyPreset extends Preset {
    /**
     * Name
     *
     * @type {String}
     */
    name = 'No bonuses';

    constructor() {
        super();
    }
}
