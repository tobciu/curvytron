import { BonusGame } from './BonusGame.ts';
import type { Game } from '../Game.ts';

/**
 * Master Bonus
 */
export class BonusGameClear extends BonusGame {
    /**
     * Duration
     */
    duration: number = 0;

    constructor(x: any, y: any) {
        super(x, y);
    }

    /**
     * Get probability
     */
    static getProbability(game: Game): number {
        const ratio = 1 - game.getAliveAvatars().count() / game.getPresentAvatars().count();

        return Math.round(ratio * 10) / 10;
    }

    /**
     * Apply on
     */
    on() {
        this.target.clearTrails();
    }
}
