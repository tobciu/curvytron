import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Custom Preset
 */
export class CustomPreset extends Preset {
    /**
     * Name
     */
    override name: string = 'Custom';

    constructor() {
        super();
    }
}
