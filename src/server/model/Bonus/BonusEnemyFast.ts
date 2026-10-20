import { BonusEnemy } from './BonusEnemy.ts';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Fast Enemy Bonus
 */
export class BonusEnemyFast extends BonusEnemy {
    /**
     * Duration
     */
    duration: number = 6000;

    constructor(x: any, y: any) {
        super(x, y);
    }

    /**
     * Get effects
     */
    getEffects(avatar: Avatar): Array<[string, any]> {
        return [['velocity', 0.75 * BaseAvatar.defaults.velocity]];
    }
}
