import { BaseBonus } from '@shared/model/BaseBonus.ts';
import { Body } from '../../core/Body.ts';

/**
 * Server bonus: carries a collision {@link Body} and an effect lifecycle
 * (`applyTo` resolves the target, turns the effect `on`, and schedules `off`).
 */
export class Bonus extends BaseBonus {
  body: Body;
  target: any = null;
  timeout: ReturnType<typeof setTimeout> | null = null;

  constructor(x: number, y: number) {
    super(x, y);
    this.body = new Body(this.x, this.y, this.radius, this);
  }

  getTarget(_avatar: any, _game: any): any {
    return null;
  }

  on(): void {}

  off(): void {}

  applyTo(avatar: unknown, game: unknown): void {
    this.target = this.getTarget(avatar, game);

    if (this.duration) {
      this.timeout = setTimeout(() => this.off(), this.duration);
    }

    this.on();
  }
}
