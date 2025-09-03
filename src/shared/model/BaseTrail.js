import EventEmitter from 'tom32i-event-emitter.js';

/**
 * BaseTrail
 */
class BaseTrail extends EventEmitter {
    constructor(avatar) {
        super();

        this.avatar = avatar;
        this.color = this.avatar.color;
        this.radius = this.avatar.radius;
        this.points = [];
        this.lastX = null;
        this.lastY = null;
        this.minLength = 5;
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

    /**
     * Is collision
     *
     * @param {Trail} trail
     *
     * @return {Boolean}
     */
    isCollision(trail) {
        if (this.points.length < 2 || trail.points.length < 2) {
            return false;
        }

        const x1 = this.lastX;
        const y1 = this.lastY;
        const radius = this.radius + trail.radius;

        for (let i = 0; i < trail.points.length - 1; i++) {
            const p1 = trail.points[i];
            const p2 = trail.points[i+1];
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d > 0) {
                const a = ((x1 - p1[0]) * dx + (y1 - p1[1]) * dy) / (d * d);
                let x, y;

                if (a < 0) {
                    x = p1[0];
                    y = p1[1];
                } else if (a > 1) {
                    x = p2[0];
                    y = p2[1];
                } else {
                    x = p1[0] + a * dx;
                    y = p1[1] + a * dy;
                }

                const dist = Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2));

                if (dist < radius) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Is self collision
     *
     * @return {Boolean}
     */
    isSelfCollision() {
        if (this.points.length < this.minLength) {
            return false;
        }

        const x1 = this.lastX;
        const y1 = this.lastY;
        const radius = this.radius * 2;

        for (let i = 0; i < this.points.length - this.minLength; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i+1];
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d > 0) {
                const a = ((x1 - p1[0]) * dx + (y1 - p1[1]) * dy) / (d * d);
                let x, y;

                if (a < 0) {
                    x = p1[0];
                    y = p1[1];
                } else if (a > 1) {
                    x = p2[0];
                    y = p2[1];
                } else {
                    x = p1[0] + a * dx;
                    y = p1[1] + a * dy;
                }

                const dist = Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2));

                if (dist < radius) {
                    return true;
                }
            }
        }

        return false;
    }
}

export default BaseTrail;
