import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Custom Preset
 */
export class CustomPreset extends Preset {
    /**
     * Name
     */
    name: string = 'Custom';

    constructor() {
        super();
    }
}
