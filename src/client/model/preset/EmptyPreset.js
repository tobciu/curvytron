import { Preset } from '../../../shared/model/Preset.ts';

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
