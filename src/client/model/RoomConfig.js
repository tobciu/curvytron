import BaseRoomConfig from '../../shared/model/BaseRoomConfig.js';
import CustomPreset from './preset/CustomPreset.js';
import DefaultPreset from './preset/DefaultPreset.js';
import SpeedPreset from './preset/SpeedPreset.js';
import SizePreset from './preset/SizePreset.js';
import SoloPreset from './preset/SoloPreset.js';
import EmptyPreset from './preset/EmptyPreset.js';
import RandomPreset from './preset/RandomPreset.js';


/**
 * Room Configuration
 */
export default class RoomConfig extends BaseRoomConfig {
    constructor(room) {
        super(room);

        this.presets = [
            new DefaultPreset(),
            new SpeedPreset(),
            new SizePreset(),
            new SoloPreset(),
            new EmptyPreset(),
            new RandomPreset()
        ];
        this.preset = this.getDefaultPreset();
        this.customPreset = new CustomPreset();

        this.bonusClasses = {
            BonusSelfSmall: 'bonus-self-small',
            BonusSelfSlow: 'bonus-self-slow',
            BonusSelfFast: 'bonus-self-fast',
            BonusSelfMaster: 'bonus-self-master',
            BonusEnemySlow: 'bonus-enemy-slow',
            BonusEnemyFast: 'bonus-enemy-fast',
            BonusEnemyBig: 'bonus-enemy-big',
            BonusEnemyInverse: 'bonus-enemy-inverse',
            BonusEnemyStraightAngle: 'bonus-enemy-straight-angle',
            BonusGameBorderless: 'bonus-game-borderless',
            BonusAllColor:'bonus-all-color',
            BonusGameClear: 'bonus-all-clear',
            BonusSelfRandom: 'bonus-self-random',
            BonusLeaderRandom: 'bonus-leader-random',
            BonusEnemyRandom: 'bonus-enemy-random',
            BonusLeaderFast: 'bonus-leader-fast',
            BonusLeaderInverse: 'bonus-leader-inverse',
            BonusLeaderSlow: 'bonus-leader-slow',
            BonusSelfBorderless: 'bonus-self-borderless'
        };

        this.variablesNames = {
            bonusRate: 'Bonus quantity'
        };
    }

    setOpen(open) {
        this.open = open;
    }

    setPassword(password) {
        this.password = password;
    }

    getBonuses() {
        const bonuses = [];
        for (const bonus in this.bonuses) {
            if (this.bonuses[bonus]) {
                bonuses.push(bonus);
            }
        }
        return bonuses.sort();
    }

    setBonus(bonus, value) {
        super.setBonus(bonus, value);
        this.checkPresets();
    }

    checkPresets() {
        const bonuses = this.getBonuses();
        for (let i = this.presets.length - 1; i >= 0; i--) {
            const preset = this.presets[i];
            if (this.bonusesMatch(preset.bonuses, bonuses)) {
                this.preset = preset;
                return;
            }
        }
        this.preset = this.customPreset;
    }

    bonusesMatch(listA, listB) {
        if (typeof(listA) !== 'object' || typeof(listB) !== 'object') {
            return false;
        }
        return listA.length === listB.length && listA.sort().toString() === listB.sort().toString();
    }

    isDefaultPreset() {
        return this.preset === this.getDefaultPreset();
    }

    getDefaultPreset() {
        return this.presets[0];
    }

    getCustomPreset() {
        return this.customPreset;
    }
}
