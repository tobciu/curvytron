import { EventEmitter } from '#event-emitter';
import { bonusDefinitions } from '../bonuses.ts';
import type { RoomConfigData } from '../protocol.ts';
import type { BaseRoom } from './BaseRoom.ts';

/**
 * Base room configuration
 */
export class BaseRoomConfig extends EventEmitter {
    room: BaseRoom;
    maxScore: number | null;
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
        this.open = true;
        this.password = null;

        this.variables = {
            bonusRate: 0
        };

        this.bonuses = Object.fromEntries(bonusDefinitions.map(({ name, enabled }) => [name, enabled]));
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
        return Math.max(1, (this.room.players.count() - 1) * 10);
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
        let password = '';

        for (let i = 0; i < this.passwordLength; i++) {
            password += Math.ceil(Math.random() * 9).toString();
        }

        return password;
    }

    /**
     * Serialize
     */
    serialize(): RoomConfigData {
        return {
            maxScore: this.maxScore,
            variables: this.variables,
            bonuses: this.bonuses,
            open: this.open,
            password: this.password
        };
    }
}
