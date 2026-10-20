import { BonusSelf } from './BonusSelf.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Ghost Bonus
 */
export class BonusSelfBorderless extends BonusSelf {
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
        return [['ghost', true]];
    }
}
