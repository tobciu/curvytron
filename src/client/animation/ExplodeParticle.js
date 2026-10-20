/**
 * Explode particle
 */
export class ExplodeParticle {
    /**
     * Opacity
     *
     * @type {Number}
     */
    static opacity = 1;

    constructor(x, y, velocity, angle, radius) {
        this.x = this.round(x);
        this.y = this.round(y);
        this.originX = x;
        this.originY = y;
        this.velocityX = Math.cos(angle) * velocity;
        this.velocityY = Math.sin(angle) * velocity;
        this.radius = radius;
    }

    /**
     * Update
     *
     * @param {Number} step
     */
    update(time) {
        this.x = this.round(this.originX + this.velocityX * time);
        this.y = this.round(this.originY + this.velocityY * time);
    }

    /**
     * Round
     *
     * @param {Number} value
     *
     * @return {Number}
     */
    round(value) {
        return (0.5 + value) | 0;
    }
}
