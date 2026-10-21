import { Bonus } from './Bonus.ts';
import type { Avatar } from '../Avatar.ts';
import type { Game } from '../Game.ts';

/**
 * Game Bonus
 */
export class BonusGame extends Bonus {
    /**
     * Affect game
     */
    override affect: string = 'game';

    constructor(x: any, y: any) {
        super(x, y);

        this.off = this.off.bind(this);
    }

    /**
     * Get target
     */
    getTarget(avatar: Avatar, game: Game) {
        return game;
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
