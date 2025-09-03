import Body from './Body.js';

/**
 * Avatar body
 */
class AvatarBody extends Body {
    constructor(x, y, avatar) {
        super(x, y, avatar.radius, avatar);

        this.num = avatar.bodyCount++;
        this.birth = new Date().getTime();
    }

    /**
     * Age considered old
     *
     * @type {Number}
     */
    oldAge = 2000;

    /**
     * Match?
     *
     * @param {Body} body
     *
     * @return {Boolean}
     */
    match(body) {
        if ((body instanceof AvatarBody) && this.data.equal(body.data)) {
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

export default AvatarBody;
