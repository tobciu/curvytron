import { EventEmitter } from '#event-emitter';
import type { BaseAvatar } from './BaseAvatar.ts';
import type { BaseGame } from './BaseGame.ts';

/**
 * BaseBonus
 */
export class BaseBonus extends EventEmitter {
    x: number;
    y: number;
    id: number | null;

    /**
     * Target affected
     */
    affect: string = 'self';

    /**
     * Radius
     */
    static radius = 3;

    radius: number = BaseBonus.radius;

    /**
     * Effect duration
     */
    duration: number = 5000;

    /**
     * Probability to appear
     */
    static probability = 1;

    constructor(x: number, y: number) {
        super();

        this.x = x;
        this.y = y;
        this.id = null;
    }

    /**
     * Clear
     */
    clear() {}

    /**
     * Effects on the target: pairs of property and value
     */
    getEffects(target: any): Array<[string, any]> {
        return [];
    }

    /**
     * Apply to target(s)
     */
    applyTo(avatar: BaseAvatar, game: BaseGame): void {}

    /**
     * Get probability
     */
    static getProbability(game: BaseGame): number {
        return BaseBonus.probability;
    }
}
