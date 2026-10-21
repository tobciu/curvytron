import { Preset } from '../../../shared/model/Preset.ts';

/**
 * Empty Preset
 */
export class EmptyPreset extends Preset {
    /**
     * Name
     */
    override name: string = 'No bonuses';

    constructor() {
        super();
    }
}
