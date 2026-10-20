import { BonusGame } from './BonusGame.ts';
import type { Game } from '../Game.ts';

/**
 * Borderless Game Bonus
 */
export class BonusGameBorderless extends BonusGame {
    /**
     * Duration
     */
    duration: number = 10000;

    /**
     * Probability
     */
    static probability: any = 0.8;

    constructor(x: any, y: any) {
        super(x, y);
    }

    /**
     * Get effects
     */
    getEffects(game: Game): Array<[string, any]> {
        return [['borderless', true]];
    }

    /**
     * Get probability
     */
    static getProbability(game: Game): number {
        return BonusGameBorderless.probability;
    }
}
