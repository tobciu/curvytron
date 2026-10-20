import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Custom Preset
 */
export class CustomPreset extends Preset {
    /**
     * Name
     *
     * @type {String}
     */
    name = 'Custom';

    constructor() {
        super();
    }
}
