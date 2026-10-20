import { EventEmitter } from '#event-emitter';

/**
 * BaseTrail
 */
export class BaseTrail extends EventEmitter {
    constructor(avatar) {
        super();

        this.avatar = avatar;
        this.color = this.avatar.color;
        this.radius = this.avatar.radius;
        this.points = [];
        this.lastX = null;
        this.lastY = null;
    }

    /**
     * Add point
     *
     * @param {Number} x
     * @param {Number} y
     */
    addPoint(x, y) {
        this.points.push([x, y]);
        this.lastX = x;
        this.lastY = y;
    }

    /**
     * Clear
     */
    clear() {
        this.points.length = 0;
        this.lastX = null;
        this.lastY = null;
    }
}
