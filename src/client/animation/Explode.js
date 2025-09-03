import Canvas from '../core/Canvas.js';
import ExplodeParticle from './ExplodeParticle.js';

/**
 * Explosion animation
 */
export default class Explode {
    constructor(avatar, effect) {
        this.effect = effect;
        this.particleTotal = 20;
        this.particles = new Array(this.particleTotal);
        this.width = 10;
        this.canvas = new Canvas(this.width, this.width);
        this.created = new Date().getTime();
        this.done = false;
        this.cleared = false;
        this.angleVariation = Math.PI / 8;
        this.duration = 500;

        const width = this.width / 2;
        this.canvas.drawCircle(width, width, width, avatar.color, avatar.color);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i] = new ExplodeParticle(
                avatar.x * this.effect.scale,
                avatar.y * this.effect.scale,
                this.randomize(avatar.velocity / 750 * this.effect.scale, 0.1),
                avatar.angle + this.angleVariation * (Math.random() * 2 - 1),
                this.effect.round(this.randomize(avatar.radius, 0.5) * this.effect.scale)
            );
        }
    }

    randomize(value, factor) {
        return value + value * factor * (Math.random() * 2 - 1);
    }

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

            this.effect.setOpacity(ExplodeParticle.prototype.opacity * (1.2 - step));

            for (let i = this.particles.length - 1; i >= 0; i--) {
                const particle = this.particles[i];
                particle.update(age);
                this.effect.drawImage(this.canvas.element, particle.x, particle.y, particle.radius, particle.radius);
            }

            this.effect.setOpacity(1);
        } else {
            this.clear();
            this.done = true;
        }
    }

    clear() {
        if (this.cleared) {
            return;
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            this.effect.clearZone(particle.x, particle.y, particle.radius, particle.radius);
        }

        this.cleared = true;
    }
}
