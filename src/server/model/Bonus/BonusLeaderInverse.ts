import { BonusLeader } from './BonusLeader.ts';
import type { Avatar } from '../Avatar.ts';
import type { Game } from '../Game.ts';

/**
 * Inverse Leader Bonus
 */
export class BonusLeaderInverse extends BonusLeader {
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
        return BonusLeader.probability * BonusLeaderInverse.probability;
    }
}
