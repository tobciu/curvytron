import { Bonus } from './Bonus.ts';
import type { Avatar } from '../Avatar.ts';
import type { Game } from '../Game.ts';

/**
 * Leader Bonus
 */
export class BonusLeader extends Bonus {
    /**
     * Affect leader
     */
    override affect: string = 'leader';

    /**
     * Probability
     */
    static override probability: any = 0.5;

    constructor(x: any, y: any) {
        super(x, y);

        this.off = this.off.bind(this);
    }

    /**
     * Get target
     */
    getTarget(avatar: Avatar, game: Game) {
        const sortAvatars = game.sortAvatars(
            game.avatars.filter(function () {
                return this.alive && !this.equal(avatar);
            })
        );
        const leader = sortAvatars.getFirst();
        if (leader !== null) {
            return sortAvatars.filter(function () {
                return this.score === leader.score;
            }).items;
        }
        return [];
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

    /**
     * Get probability
     */
    static override getProbability(game: Game): number {
        const leader = game
            .sortAvatars(
                game.avatars.filter(function () {
                    return this.alive;
                })
            )
            .getFirst();
        if (leader === null) {
            return 0;
        } else if (leader.score === 0) {
            return 0;
        }
        return BonusLeader.probability;
    }
}
