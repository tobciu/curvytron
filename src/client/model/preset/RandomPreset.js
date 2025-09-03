import Preset from '../../../shared/model/Preset.js';

/**
 * Random Preset
 */
export default class RandomPreset extends Preset {
    constructor() {
        super();

        this.name = 'Random';
        this.bonuses = [
            'BonusSelfRandom',
            'BonusLeaderRandom',
            'BonusEnemyRandom'
        ];
    }
}
