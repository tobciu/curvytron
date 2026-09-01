/** One fragment of an {@link Explode}; flies out from the death point. */
export class ExplodeParticle {
  static readonly opacity = 1;

  x: number;
  y: number;
  originX: number;
  originY: number;
  velocityX: number;
  velocityY: number;
  radius: number;

  constructor(x: number, y: number, velocity: number, angle: number, radius: number) {
    this.x = this.round(x);
    this.y = this.round(y);
    this.originX = x;
    this.originY = y;
    this.velocityX = Math.cos(angle) * velocity;
    this.velocityY = Math.sin(angle) * velocity;
    this.radius = radius;
  }

  update(time: number): void {
    this.x = this.round(this.originX + this.velocityX * time);
    this.y = this.round(this.originY + this.velocityY * time);
  }

  round(value: number): number {
    return (0.5 + value) | 0;
  }
}
