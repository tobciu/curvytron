import { BonusEnemy } from './BonusEnemy.ts';
import type { Avatar } from '../Avatar.ts';
import type { Game } from '../Game.ts';

/**
 * Inverse Enemy Bonus
 */
export class BonusEnemyInverse extends BonusEnemy {
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
    getEffects(avatar: Avatar): Array<[string, any]> {
        return [['inverse', 1]];
    }

    /**
     * Get probability
     */
    static getProbability(game: Game): number {
        return BonusEnemyInverse.probability;
    }
}
