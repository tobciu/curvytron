import Preset from '../../../shared/model/Preset.js';

/**
 * Empty Preset
 */
export default class EmptyPreset extends Preset {
    constructor() {
        super();

        this.name = 'None';
    }
}
