import { EventEmitter } from '#event-emitter';
import { selectableBonuses } from '../bonuses.ts';
import type { RoomConfigData } from '../protocol.ts';
import {
    defaultMinutes,
    defaultRounds,
    defaultScorePerPlayer,
    defaultScoringMode,
    defaultWinCondition,
    defaultWinConditions,
    isScoringMode,
    isWinCondition,
    maxMinutes,
    maxRounds
} from '../scoring.ts';
import type { ScoringModeId, WinConditionId } from '../scoring.ts';
import type { BaseRoom } from './BaseRoom.ts';

/**
 * Base room configuration
 */
export class BaseRoomConfig extends EventEmitter {
    room: BaseRoom;
    maxScore: number | null;
    /** How the game is scored */
    mode: ScoringModeId;
    /** When the game is over: the value is `maxScore`, `rounds` or `minutes` (null for the default) */
    winCondition: WinConditionId;
    rounds: number | null;
    minutes: number | null;
    open: boolean;
    password: string | null;
    variables: Record<string, number>;
    bonuses: Record<string, boolean>;

    /**
     * Password length
     */
    passwordLength: number = 4;

    constructor(room: BaseRoom) {
        super();

        this.room = room;
        this.maxScore = null;
        this.mode = defaultScoringMode;
        this.winCondition = defaultWinCondition;
        this.rounds = null;
        this.minutes = null;
        this.open = true;
        this.password = null;

        this.variables = {
            bonusRate: 0
        };

        this.bonuses = Object.fromEntries(selectableBonuses.map(({ name, enabled }) => [name, enabled]));
    }

    /**
     * Set max score
     */
    setMaxScore(value: number | string) {
        const maxScore = typeof value === 'string' ? Number.parseInt(value, 10) : value;

        this.maxScore = maxScore || null;

        return true;
    }

    /**
     * Set the way the game is scored
     */
    setMode(mode: unknown): boolean {
        if (!isScoringMode(mode)) {
            return false;
        }

        if (this.mode !== mode) {
            this.mode = mode;
            // Every mode has its way to end, the master can change it again
            this.winCondition = defaultWinConditions[mode];
        }

        return true;
    }

    /**
     * Set when the game is over, and optionally the value that goes with it (the score, the rounds or the minutes)
     */
    setWinCondition(condition: unknown, value?: number | string | null): boolean {
        if (!isWinCondition(condition)) {
            return false;
        }

        const number = typeof value === 'string' ? Number.parseInt(value, 10) : value;

        if (number !== undefined && number !== null && !Number.isFinite(number)) {
            return false;
        }

        this.winCondition = condition;

        if (number === undefined) {
            return true;
        }

        if (condition === 'points') {
            this.setMaxScore(number ?? 0);
        } else if (condition === 'rounds') {
            this.rounds = number && number > 0 ? Math.min(Math.trunc(number), maxRounds) : null;
        } else {
            this.minutes = number && number > 0 ? Math.min(Math.trunc(number), maxMinutes) : null;
        }

        return true;
    }

    /**
     * Get the rounds of a game that is played for a number of rounds
     */
    getRounds(): number {
        return this.rounds ?? defaultRounds;
    }

    /**
     * Get the minutes of a game that is played for some time
     */
    getMinutes(): number {
        return this.minutes ?? defaultMinutes;
    }

    /**
     * Variable exists
     */
    variableExists(variable: string): boolean {
        return this.variables[variable] !== undefined;
    }

    /**
     * Set variable
     */
    setVariable(variable: string, input: number | string) {
        if (!this.variableExists(variable)) {
            return false;
        }

        const value = typeof input === 'string' ? Number.parseFloat(input) : input;

        if (-1 > value || value > 1) {
            return false;
        }

        this.variables[variable] = value;

        return true;
    }

    /**
     * Get variable
     */
    getVariable(variable: string): number | undefined {
        if (!this.variableExists(variable)) {
            return;
        }

        return this.variables[variable];
    }

    /**
     * Bonus exists
     */
    bonusExists(bonus: string): boolean {
        return this.bonuses[bonus] !== undefined;
    }

    /**
     * Toggle bonus
     */
    toggleBonus(bonus: string): boolean {
        if (!this.bonusExists(bonus)) {
            return false;
        }

        this.bonuses[bonus] = !this.bonuses[bonus];

        return true;
    }

    /**
     * Get bonus value
     */
    getBonus(bonus: string): boolean | undefined {
        if (!this.bonusExists(bonus)) {
            return;
        }

        return this.bonuses[bonus];
    }

    /**
     * Set bonus value
     */
    setBonus(bonus: string, value: unknown): void {
        if (!this.bonusExists(bonus)) {
            return;
        }

        this.bonuses[bonus] = !!value;
    }

    /**
     * Get max score
     */
    getMaxScore(): number {
        return this.maxScore ? this.maxScore : this.getDefaultMaxScore();
    }

    /**
     * Get max score
     */
    getDefaultMaxScore(): number {
        return Math.max(1, (this.room.players.count() - 1) * defaultScorePerPlayer[this.mode]);
    }

    /**
     * Authorise joinning the room
     */
    allow(password: string): boolean {
        return this.open || this.password === password;
    }

    /**
     * Generate password
     */
    generatePassword(): string {
        // The join password guards the room, so use a cryptographically secure generator
        const digits = new Uint8Array(this.passwordLength);

        globalThis.crypto.getRandomValues(digits);

        return Array.from(digits, (byte) => String((byte % 9) + 1)).join('');
    }

    /**
     * Serialize
     */
    serialize(): RoomConfigData {
        return {
            maxScore: this.maxScore,
            mode: this.mode,
            winCondition: this.winCondition,
            rounds: this.rounds,
            minutes: this.minutes,
            variables: this.variables,
            bonuses: this.bonuses,
            open: this.open,
            password: this.password
        };
    }
}
