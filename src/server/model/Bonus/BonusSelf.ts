import { Bonus } from './Bonus.ts';
import type { Avatar } from '../Avatar.ts';
import type { Game } from '../Game.ts';

/**
 * Self Bonus
 */
export class BonusSelf extends Bonus {
    /**
     * Affect self
     */
    affect: string = 'self';

    constructor(x: any, y: any) {
        super(x, y);

        this.off = this.off.bind(this);
    }

    /**
     * Get target
     */
    getTarget(avatar: Avatar, game: Game) {
        return avatar.alive ? avatar : null;
    }

    /**
     * Apply on
     */
    on() {
        if (this.target) {
            this.target.bonusStack.add(this);
        }
    }

    /**
     * Apply on
     */
    off() {
        if (this.target) {
            this.target.bonusStack.remove(this);
        }
    }
}
