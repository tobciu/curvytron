import { EventEmitter } from 'eventemitter3';
import { BaseTrail } from './BaseTrail.ts';
import { BaseBonusStack } from './BaseBonusStack.ts';

export interface AvatarPlayer {
  id: string | number;
  name: string;
  color: string;
}

/**
 * A player's curve: position, heading, velocity, trail, bonus stack, score.
 * Physics constants live as `static readonly` defaults; the per-instance copies
 * are mutated by bonuses and reset by {@link clear}.
 */
export class BaseAvatar extends EventEmitter {
  static readonly velocity = 16;
  static readonly angularVelocityBase = 2.8 / 1000;
  static readonly radius = 0.6;
  static readonly inverse = false;
  static readonly invincible = false;
  static readonly directionInLoop = true;

  /**
   * Concrete Trail / BonusStack — overridden by the client/server Avatar subclasses.
   * **static** (not an instance field) so they are already in place when the base
   * constructor runs — an instance-field initializer would run *after* super().
   */
  static TrailClass: new (owner: any) => BaseTrail = BaseTrail;
  static BonusStackClass: new (owner: any) => BaseBonusStack = BaseBonusStack;

  id: string | number;
  name: string;
  color: string;
  borderColor: string;
  player: AvatarPlayer;
  x = 0;
  y = 0;
  trail: BaseTrail;
  bonusStack: BaseBonusStack;
  angle = 0;
  velocityX = 0;
  velocityY = 0;
  angularVelocity = 0;
  alive = true;
  printing = false;
  score = 0;
  roundScore = 0;
  ready = false;
  present = true;

  velocity = BaseAvatar.velocity;
  angularVelocityBase = BaseAvatar.angularVelocityBase;
  radius = BaseAvatar.radius;
  trailLatency = 3;
  inverse = BaseAvatar.inverse;
  invincible = BaseAvatar.invincible;
  ghost = false;
  directionInLoop = BaseAvatar.directionInLoop;

  /** Set by the server Avatar (collision body). */
  body?: { radius: number };

  constructor(player: AvatarPlayer) {
    super();

    this.id = player.id;
    this.name = player.name;
    this.color = player.color;
    this.borderColor = player.color;
    this.player = player;
    const ctor = this.constructor as typeof BaseAvatar;
    this.trail = new ctor.TrailClass(this);
    this.bonusStack = new ctor.BonusStackClass(this);
  }

  equal(avatar: BaseAvatar): boolean {
    return this.id === avatar.id;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  addPoint(x: number, y: number, _important?: boolean): void {
    this.trail.addPoint(x, y);
  }

  updateAngularVelocity(factor?: number): void {
    if (typeof factor === 'undefined') {
      if (this.angularVelocity === 0) {
        return;
      }
      factor = (this.angularVelocity > 0 ? 1 : -1) * (this.inverse ? -1 : 1);
    }

    this.setAngularVelocity(factor * this.angularVelocityBase * (this.inverse ? -1 : 1));
  }

  setAngularVelocity(angularVelocity: number): void {
    this.angularVelocity = angularVelocity;
  }

  setAngle(angle: number): void {
    if (this.angle !== angle) {
      this.angle = angle;
      this.updateVelocities();
    }
  }

  update(_step: number): void {}

  updateAngle(step: number): void {
    if (this.angularVelocity) {
      if (this.directionInLoop) {
        this.setAngle(this.angle + this.angularVelocity * step);
      } else {
        this.setAngle(this.angle + this.angularVelocity);
        this.updateAngularVelocity(0);
      }
    }
  }

  updatePosition(step: number): void {
    this.setPosition(this.x + this.velocityX * step, this.y + this.velocityY * step);
  }

  setVelocity(velocity: number): void {
    velocity = Math.max(velocity, BaseAvatar.velocity / 2);

    if (this.velocity !== velocity) {
      this.velocity = velocity;
      this.updateVelocities();
    }
  }

  updateVelocities(): void {
    const velocity = this.velocity / 1000;

    this.velocityX = Math.cos(this.angle) * velocity;
    this.velocityY = Math.sin(this.angle) * velocity;

    this.updateBaseAngularVelocity();
  }

  updateBaseAngularVelocity(): void {
    if (this.directionInLoop) {
      const ratio = this.velocity / BaseAvatar.velocity;
      this.angularVelocityBase =
        ratio * BaseAvatar.angularVelocityBase + Math.log(1 / ratio) / 1000;
      this.updateAngularVelocity();
    }
  }

  setRadius(radius: number): void {
    this.radius = Math.max(radius, BaseAvatar.radius / 8);
  }

  setInverse(inverse: boolean): void {
    if (this.inverse !== inverse) {
      this.inverse = inverse ? true : false;
      this.updateAngularVelocity();
    }
  }

  setInvincible(invincible: boolean): void {
    this.invincible = invincible ? true : false;
  }

  setGhost(ghost: boolean): void {
    this.ghost = ghost ? true : false;
  }

  getDistance(fromX: number, fromY: number, toX: number, toY: number): number {
    return Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
  }

  die(): void {
    this.bonusStack.clear();
    this.alive = false;
    this.addPoint(this.x, this.y);
  }

  setPrinting(printing: boolean): void {
    printing = printing ? true : false;

    if (this.printing !== printing) {
      this.printing = printing;

      this.addPoint(this.x, this.y, true);

      if (!this.printing) {
        this.trail.clear();
      }
    }
  }

  addScore(score: number): void {
    this.setRoundScore(this.roundScore + score);
  }

  resolveScore(): void {
    this.setScore(this.score + this.roundScore);
    this.roundScore = 0;
  }

  setRoundScore(score: number): void {
    this.roundScore = score;
  }

  setScore(score: number): void {
    this.score = score;
  }

  setColor(color: string): void {
    this.color = color;
  }

  setBorderColor(borderColor: string): void {
    this.borderColor = borderColor;
  }

  clear(): void {
    this.bonusStack.clear();

    this.x = this.radius;
    this.y = this.radius;
    this.angle = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.angularVelocity = 0;
    this.roundScore = 0;
    this.velocity = BaseAvatar.velocity;
    this.alive = true;
    this.ghost = false;
    this.printing = false;
    this.color = this.player.color;
    this.borderColor = this.player.color;
    this.radius = BaseAvatar.radius;
    this.inverse = BaseAvatar.inverse;
    this.invincible = BaseAvatar.invincible;
    this.directionInLoop = BaseAvatar.directionInLoop;
    this.angularVelocityBase = BaseAvatar.angularVelocityBase;

    if (this.body) {
      this.body.radius = BaseAvatar.radius;
    }
  }

  destroy(): void {
    this.clear();
    this.present = false;
    this.alive = false;
  }

  serialize(): {
    id: string | number;
    name: string;
    color: string;
    borderColor: string;
    score: number;
  } {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      borderColor: this.borderColor,
      score: this.score,
    };
  }
}
