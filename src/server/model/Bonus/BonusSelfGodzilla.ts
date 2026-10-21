import { BonusSelf } from './BonusSelf.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Godzilla Bonus
 */
export class BonusSelfGodzilla extends BonusSelf {
    constructor(x: any, y: any) {
        super(x, y);
    }

    /**
     * Get effects
     */
    override getEffects(avatar: Avatar): Array<[string, any]> {
        return [
            ['invincible', true],
            ['printing', 100],
            ['radius', 10],
            ['velocity', 6]
        ];
    }
}
