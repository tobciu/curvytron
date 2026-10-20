/**
 * Explode particle
 */
export class ExplodeParticle {
    x: any;
    y: any;
    originX: any;
    originY: any;
    velocityX: number;
    velocityY: number;
    radius: any;

    /**
     * Opacity
     */
    static opacity: any = 1;

    constructor(x: any, y: any, velocity: any, angle: any, radius: any) {
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
     */
    update(time: any) {
        this.x = this.round(this.originX + this.velocityX * time);
        this.y = this.round(this.originY + this.velocityY * time);
    }

    /**
     * Round
     */
    round(value: number): number {
        return (0.5 + value) | 0;
    }
}
