import { Bonus } from './Bonus.ts';
import type { Avatar } from '../Avatar.ts';
import type { Game } from '../Game.ts';

/**
 * Enemy Bonus
 */
export class BonusEnemy extends Bonus {
    /**
     * Affect enemy
     */
    override affect: string = 'enemy';

    constructor(x: any, y: any) {
        super(x, y);

        this.off = this.off.bind(this);
    }

    /**
     * Get target
     */
    getTarget(avatar: Avatar, game: Game) {
        return game.avatars.filter(function () {
            return this.alive && !this.equal(avatar);
        }).items;
    }

    /**
     * Apply on
     */
    on() {
        for (let i = this.target.length - 1; i >= 0; i--) {
            this.target[i].bonusStack.add(this);
        }
    }

    /**
     * Apply on
     */
    off() {
        for (let i = this.target.length - 1; i >= 0; i--) {
            this.target[i].bonusStack.remove(this);
        }
    }
}
