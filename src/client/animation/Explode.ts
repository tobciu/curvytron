import { Canvas } from '../core/Canvas.ts';
import { ExplodeParticle } from './ExplodeParticle.ts';

interface ExplodingAvatar {
  x: number;
  y: number;
  color: string;
  velocity: number;
  angle: number;
  radius: number;
}

/** The particle burst drawn on the effect layer when an avatar dies. */
export class Explode {
  static readonly width = 10;
  static readonly angleVariation = Math.PI / 8;
  static readonly particleTotal = 20;
  static readonly duration = 500;

  effect: Canvas;
  particles: ExplodeParticle[];
  canvas: Canvas;
  created: number;
  done = false;
  cleared = false;
  lastRender = 0;

  constructor(avatar: ExplodingAvatar, effect: Canvas) {
    this.effect = effect;
    this.particles = new Array(Explode.particleTotal);
    this.canvas = new Canvas(Explode.width, Explode.width);
    this.created = new Date().getTime();

    const width = Explode.width / 2;
    this.canvas.drawCircle(width, width, width, avatar.color, avatar.color);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i] = new ExplodeParticle(
        avatar.x * this.effect.scale,
        avatar.y * this.effect.scale,
        this.randomize((avatar.velocity / 750) * this.effect.scale, 0.1),
        avatar.angle + Explode.angleVariation * (Math.random() * 2 - 1),
        this.effect.round(this.randomize(avatar.radius, 0.5) * this.effect.scale),
      );
    }
  }

  randomize(value: number, factor: number): number {
    return value + value * factor * (Math.random() * 2 - 1);
  }

  draw(): void {
    if (this.done) {
      return;
    }

    this.clear();
    this.lastRender = new Date().getTime();
    this.cleared = false;

    const age = this.lastRender - this.created;

    if (age <= Explode.duration) {
      const step = age / Explode.duration;
      this.effect.setOpacity(ExplodeParticle.opacity * (1.2 - step));

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i]!;
        particle.update(age);
        this.effect.drawImage(
          this.canvas.element,
          particle.x,
          particle.y,
          particle.radius,
          particle.radius,
        );
      }

      this.effect.setOpacity(1);
    } else {
      this.clear();
      this.done = true;
    }
  }

  clear(): void {
    if (this.cleared) {
      return;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]!;
      this.effect.clearZone(particle.x, particle.y, particle.radius, particle.radius);
    }
    this.cleared = true;
  }
}
