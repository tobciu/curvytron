import { ExplodeParticle } from './ExplodeParticle.ts';
import { Canvas } from '../core/Canvas.ts';

/**
 * Explosion animation
 */
export class Explode {
    effect: any;
    particles: any;
    canvas: Canvas;
    created: any;
    done: boolean;
    cleared: boolean;
    lastRender: any;

    /**
     * Canvas width
     */
    width: number = 10;

    /**
     * Angle variation
     */
    angleVariation: number = Math.PI / 8;

    /**
     * Number of particles to generate
     */
    particleTotal: number = 20;

    /**
     * Animation duration
     */
    duration: number = 500;

    constructor(avatar: any, effect: any) {
        this.effect = effect;
        this.particles = new Array(this.particleTotal);
        this.canvas = new Canvas(this.width, this.width);
        this.created = new Date().getTime();
        this.done = false;
        this.cleared = false;

        const width = this.width / 2;

        this.canvas.drawCircle(width, width, width, avatar.color, avatar.color);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i] = new ExplodeParticle(
                avatar.x * this.effect.scale,
                avatar.y * this.effect.scale,
                this.randomize((avatar.velocity / 750) * this.effect.scale, 0.1),
                avatar.angle + this.angleVariation * (Math.random() * 2 - 1),
                this.effect.round(this.randomize(avatar.radius, 0.5) * this.effect.scale)
            );
        }
    }

    /**
     * Randomize value
     */
    randomize(value: number, factor: number): number {
        return value + value * factor * (Math.random() * 2 - 1);
    }

    /**
     * Draw particles
     */
    draw() {
        if (this.done) {
            return;
        }

        this.clear();

        this.lastRender = new Date().getTime();
        this.cleared = false;

        const age = this.lastRender - this.created;

        if (age <= this.duration) {
            const step = age / this.duration;

            this.effect.setOpacity(ExplodeParticle.opacity * (1.2 - step));

            for (let particle, i = this.particles.length - 1; i >= 0; i--) {
                particle = this.particles[i];
                particle.update(age);
                this.effect.drawImage(this.canvas.element, particle.x, particle.y, particle.radius, particle.radius);
            }

            this.effect.setOpacity(1);
        } else {
            this.clear();
            this.done = true;
        }
    }

    /**
     * Clear particles from cache
     */
    clear() {
        if (this.cleared) {
            return;
        }

        for (let particle, i = this.particles.length - 1; i >= 0; i--) {
            particle = this.particles[i];
            this.effect.clearZone(particle.x, particle.y, particle.radius, particle.radius);
        }

        this.cleared = true;
    }
}
