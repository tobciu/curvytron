import { BonusSelf } from './BonusSelf.ts';
import { BaseAvatar } from '../../../shared/model/BaseAvatar.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Fast Bonus
 */
export class BonusSelfFast extends BonusSelf {
    /**
     * Duration
     */
    override duration: number = 4000;

    constructor(x: any, y: any) {
        super(x, y);
    }

    /**
     * Get effects
     */
    override getEffects(avatar: Avatar): Array<[string, any]> {
        return [['velocity', 0.75 * BaseAvatar.defaults.velocity]];
    }
}
