import { BonusLeader } from './BonusLeader.ts';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Slow Leader Bonus
 */
export class BonusLeaderSlow extends BonusLeader {
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
