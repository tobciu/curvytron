import { BonusSelf } from './BonusSelf.ts';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Slow Bonus
 */
export class BonusSelfSlow extends BonusSelf {
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
