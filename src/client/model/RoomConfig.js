import { CustomPreset } from './preset/CustomPreset.js';
import { DefaultPreset } from './preset/DefaultPreset.js';
import { EmptyPreset } from './preset/EmptyPreset.js';
import { RandomPreset } from './preset/RandomPreset.js';
import { SizePreset } from './preset/SizePreset.js';
import { SoloPreset } from './preset/SoloPreset.js';
import { SpeedPreset } from './preset/SpeedPreset.js';
import { BaseRoomConfig } from '../../shared/model/BaseRoomConfig.ts';

/**
 * Room Configuration
 *
 * @param {Room} room
 */
export class RoomConfig extends BaseRoomConfig {
    /**
     * Bonus classes
     *
     * @type {Object}
     */
    bonusClasses = {
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
        BonusAllColor: 'bonus-all-color',
        BonusGameClear: 'bonus-all-clear',
        BonusSelfRandom: 'bonus-self-random',
        BonusLeaderRandom: 'bonus-leader-random',
        BonusEnemyRandom: 'bonus-enemy-random',
        BonusLeaderFast: 'bonus-leader-fast',
        BonusLeaderInverse: 'bonus-leader-inverse',
        BonusLeaderSlow: 'bonus-leader-slow',
        BonusSelfBorderless: 'bonus-self-borderless'
    };

    /**
     * Variables names
     *
     * @type {Object}
     */
    variablesNames = {
        bonusRate: 'Bonus quantity'
    };

    /**
     * Presets
     *
     * @type {Object}
     */
    presets = [
        new DefaultPreset(),
        new SpeedPreset(),
        new SizePreset(),
        new SoloPreset(),
        new EmptyPreset(),
        new RandomPreset()
    ];

    constructor(room) {
        super(room);

        this.preset = this.getDefaultPreset();
        this.customPreset = new CustomPreset();
    }

    /**
     * Set open
     *
     * @param {String} open
     */
    setOpen(open) {
        this.open = open;
    }

    /**
     * Set password
     *
     * @param {String} password
     */
    setPassword(password) {
        this.password = password;
    }

    /**
     * Get available bonuses
     *
     * @return {Array}
     */
    getBonuses() {
        const bonuses = [];

        for (const bonus in this.bonuses) {
            if (this.bonuses[bonus]) {
                bonuses.push(bonus);
            }
        }

        return bonuses.sort();
    }

    /**
     * Set bonus value
     *
     * @param {String} bonus
     * @param {Boolean} value
     *
     * @return {Boolean}
     */
    setBonus(bonus, value) {
        super.setBonus(bonus, value);
        this.checkPresets();
    }

    /**
     * Check preset
     */
    checkPresets() {
        const bonuses = this.getBonuses();
        let preset;

        for (let i = this.presets.length - 1; i >= 0; i--) {
            preset = this.presets[i];
            if (this.bonusesMatch(preset.bonuses, bonuses)) {
                this.preset = preset;

                return;
            }
        }

        this.preset = this.customPreset;
    }

    /**
     * Bonuses match
     *
     * @param {Array} listA
     * @param {Array} listB
     *
     * @return {Boolean}
     */
    bonusesMatch(listA, listB) {
        if (typeof listA !== 'object' || typeof listA !== 'object') {
            return false;
        }

        return listA.length === listB.length && listA.sort().toString() === listB.sort().toString();
    }

    /**
     * IS default preset
     *
     * @return {Boolean}
     */
    isDefaultPreset() {
        return this.preset === this.getDefaultPreset();
    }

    /**
     * Get default preset
     *
     * @return {Preset}
     */
    getDefaultPreset() {
        return this.presets[0];
    }

    /**
     * Get custom preset
     *
     * @return {CustomPreset}
     */
    getCustomPreset() {
        return this.customPreset;
    }
}
