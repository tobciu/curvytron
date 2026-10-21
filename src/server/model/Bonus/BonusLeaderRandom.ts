import { BonusLeader } from './BonusLeader.ts';
import type { Avatar } from '../Avatar.ts';

/**
 * Random Leader Bonus
 */
export class BonusLeaderRandom extends BonusLeader {
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
