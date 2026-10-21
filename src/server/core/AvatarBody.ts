import { Body } from './Body.ts';
import type { Avatar } from '../model/Avatar.ts';

/**
 * Avatar body
 */
export class AvatarBody extends Body {
    num: number;
    birth: number;

    /**
     * Age considered old
     */
    oldAge: number = 2000;

    constructor(x: number, y: number, avatar: Avatar) {
        super(x, y, avatar.radius, avatar);

        this.num = avatar.bodyCount++;
        this.birth = new Date().getTime();
    }

    /**
     * Match?
     */
    override match(body: Body): boolean {
        if (body instanceof AvatarBody && this.data.equal(body.data)) {
            return body.num - this.num > this.data.trailLatency;
        }

        return true;
    }

    /**
     * Is old?
     */
    isOld(): boolean {
        return new Date().getTime() - this.birth >= this.oldAge;
    }
}
