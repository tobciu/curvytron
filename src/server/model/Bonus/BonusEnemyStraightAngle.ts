import { BonusEnemy } from './BonusEnemy.ts';
import type { Avatar } from '../Avatar.ts';
import type { Game } from '../Game.ts';

/**
 * Inverse Enemy Straight Angle
 */
export class BonusEnemyStraightAngle extends BonusEnemy {
    /**
     * Duration
     */
    duration: number = 5000;

    /**
     * Probability
     */
    static probability: any = 0.6;

    constructor(x: any, y: any) {
        super(x, y);
    }

    /**
     * Get effects
     */
    getEffects(avatar: Avatar): Array<[string, any]> {
        return [
            ['directionInLoop', false],
            ['angularVelocityBase', Math.PI / 2]
        ];
    }

    /**
     * Get probability
     */
    static getProbability(game: Game): number {
        return BonusEnemyStraightAngle.probability;
    }
}
