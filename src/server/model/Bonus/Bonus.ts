import { Body } from '../../core/Body.ts';
import { BaseBonus } from '../../../shared/model/BaseBonus.ts';
import type { Avatar } from '../Avatar.ts';
import type { Game } from '../Game.ts';

/**
 * Bonus
 */
export abstract class Bonus extends BaseBonus {
    body: Body;
    target: any;
    timeout: any;
    /** How long the bonus stays on the map (ms), null for the ones that stay until somebody catches them */
    lifetime: number | null = null;
    /** When it goes away (ms since 1970), null without a lifetime */
    expiresAt: number | null = null;

    /** Resolve the avatar(s) affected by the bonus */
    abstract getTarget(avatar: Avatar, game: Game): any;

    /** Apply the effect */
    abstract override on(): void;

    /** Remove the effect */
    abstract override off(): void;

    constructor(x: number, y: number) {
        super(x, y);

        this.body = new Body(this.x, this.y, this.radius, this);
        this.target = null;
        this.timeout = null;
    }

    /**
     * Apply bonus callback
     */
    override applyTo(avatar: Avatar, game: Game) {
        this.target = this.getTarget(avatar, game);

        if (this.duration) {
            this.timeout = setTimeout(this.off, this.duration);
        }

        this.on();
    }
}
