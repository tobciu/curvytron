import { BonusSelf } from './BonusSelf.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Random Self Bonus
 */
export class BonusSelfRandom extends BonusSelf {
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
