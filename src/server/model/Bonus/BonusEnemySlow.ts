import { BonusEnemy } from './BonusEnemy.ts';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Slow Enemy Bonus
 */
export class BonusEnemySlow extends BonusEnemy {
    constructor(x: any, y: any) {
        super(x, y);
    }

    /**
     * Get effects
     */
    override getEffects(avatar: Avatar): Array<[string, any]> {
        return [['velocity', -BaseAvatar.defaults.velocity / 2]];
    }
}
