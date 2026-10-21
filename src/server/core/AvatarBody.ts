import { Body } from './Body.ts';

/**
 * Avatar body
 */
export class AvatarBody extends Body {
    num: any;
    birth: any;

    /**
     * Age considered old
     */
    oldAge: number = 2000;

    constructor(x: any, y: any, avatar: any) {
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
