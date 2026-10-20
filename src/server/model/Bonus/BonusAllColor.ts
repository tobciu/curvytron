import { BonusAll } from './BonusAll.ts';
import type { Avatar } from '../Avatar.ts';
import type { Game } from '../Game.ts';

/**
 * Big All Color
 */
export class BonusAllColor extends BonusAll {
    avatars: any;
    colors: any;

    /**
     * Duration
     */
    duration: number = 7500;

    constructor(x: any, y: any) {
        super(x, y);

        this.getColor = this.getColor.bind(this);
    }

    /**
     * Get target
     */
    getTarget(avatar: Avatar, game: Game) {
        const targets = super.getTarget(avatar, game);

        this.avatars = new Array(targets.length);
        this.colors = new Array(targets.length);

        for (let i = targets.length - 1; i >= 0; i--) {
            this.avatars[i] = targets[i].id;
            this.colors[i] = targets[i].color;
        }

        return targets;
    }

    /**
     * Get effects
     */
    getEffects(avatar: Avatar): Array<[string, any]> {
        return [['color', this.getColor(avatar)]];
    }

    /**
     * Get color
     */
    getColor(avatar: Avatar): string {
        const index = this.avatars.indexOf(avatar.id);

        return this.colors[(index + 1) % this.colors.length];
    }
}
