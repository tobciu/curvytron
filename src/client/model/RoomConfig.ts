import { CustomPreset } from './preset/CustomPreset.ts';
import { DefaultPreset } from './preset/DefaultPreset.ts';
import { EmptyPreset } from './preset/EmptyPreset.ts';
import { RandomPreset } from './preset/RandomPreset.ts';
import { SizePreset } from './preset/SizePreset.ts';
import { SoloPreset } from './preset/SoloPreset.ts';
import { SpeedPreset } from './preset/SpeedPreset.ts';
import { BaseRoomConfig } from '../../shared/model/BaseRoomConfig.ts';

/**
 * Room Configuration
 */
export class RoomConfig extends BaseRoomConfig {
    preset: any;
    customPreset: CustomPreset;

    /**
     * Bonus classes
     */
    bonusClasses: any = {
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
     */
    variablesNames: any = {
        bonusRate: 'Bonus quantity'
    };

    /**
     * Presets
     */
    presets: any[] = [
        new DefaultPreset(),
        new SpeedPreset(),
        new SizePreset(),
        new SoloPreset(),
        new EmptyPreset(),
        new RandomPreset()
    ];

    constructor(room: any) {
        super(room);

        this.preset = this.getDefaultPreset();
        this.customPreset = new CustomPreset();
    }

    /**
     * Set open
     */
    setOpen(open: boolean) {
        this.open = open;
    }

    /**
     * Set password
     */
    setPassword(password: string | null) {
        this.password = password;
    }

    /**
     * Get available bonuses
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
     */
    setBonus(bonus: string, value: boolean): void {
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
     */
    bonusesMatch(listA?: string[], listB?: string[]): boolean {
        if (!listA || !listB) {
            return false;
        }

        return listA.length === listB.length && listA.sort().toString() === listB.sort().toString();
    }

    /**
     * IS default preset
     */
    isDefaultPreset(): boolean {
        return this.preset === this.getDefaultPreset();
    }

    /**
     * Get default preset
     */
    getDefaultPreset() {
        return this.presets[0];
    }

    /**
     * Get custom preset
     */
    getCustomPreset() {
        return this.customPreset;
    }
}
