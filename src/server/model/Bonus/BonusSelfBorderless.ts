import { BonusSelf } from './BonusSelf.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Ghost Bonus
 */
export class BonusSelfBorderless extends BonusSelf {
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
        return [['ghost', true]];
    }
}
