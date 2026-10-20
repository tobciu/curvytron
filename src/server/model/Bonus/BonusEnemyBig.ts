import { BonusEnemy } from './BonusEnemy.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Big Enemy Bonus
 */
export class BonusEnemyBig extends BonusEnemy {
    /**
     * Duration
     */
    duration: number = 7500;

    constructor(x: any, y: any) {
        super(x, y);
    }

    /**
     * Get effects
     */
    getEffects(avatar: Avatar): Array<[string, any]> {
        return [['radius', 1]];
    }
}
