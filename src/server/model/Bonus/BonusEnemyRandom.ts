import { BonusEnemy } from './BonusEnemy.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Random Enemy Bonus
 */
export class BonusEnemyRandom extends BonusEnemy {
    /**
     * Duration
     */
    override duration: number = 7500;

    constructor(x: any, y: any) {
        super(x, y);
    }

    /**
     * Get effects
     */
    override getEffects(avatar: Avatar): Array<[string, any]> {
        return [
            ['directionInLoop', false],
            ['angularVelocityBase', Math.PI / 4]
        ];
    }
}
