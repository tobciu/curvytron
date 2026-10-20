import { Body } from './Body.js';

/**
 * Avatar body
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Avatar} avatar
 */
export class AvatarBody extends Body {
    /**
     * Age considered old
     *
     * @type {Number}
     */
    oldAge = 2000;

    constructor(x, y, avatar) {
        super(x, y, avatar.radius, avatar);

        this.num = avatar.bodyCount++;
        this.birth = new Date().getTime();
    }

    /**
     * Match?
     *
     * @param {Body} body
     *
     * @return {Boolean}
     */
    match(body) {
        if (body instanceof AvatarBody && this.data.equal(body.data)) {
            return body.num - this.num > this.data.trailLatency;
        }

        return true;
    }

    /**
     * Is old?
     *
     * @return {Boolean}
     */
    isOld() {
        return new Date().getTime() - this.birth >= this.oldAge;
    }
}
