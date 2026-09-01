import { BaseAvatar, type AvatarPlayer } from '@shared/model/BaseAvatar.ts';
import { Trail } from './Trail.ts';
import { BonusStack } from './BonusStack.ts';
import { AvatarBody } from '../core/AvatarBody.ts';
import { PrintManager } from '../manager/PrintManager.ts';

/**
 * Server avatar: adds the collision {@link AvatarBody}, the trail-gap
 * {@link PrintManager}, and emits a `position` / `angle` / `property` / `point`
 * event on every relevant change (the GameController forwards them to clients).
 */
export class Avatar extends BaseAvatar {
  static override TrailClass = Trail;
  static override BonusStackClass = BonusStack;

  bodyCount = 0;
  override body: AvatarBody;
  printManager: PrintManager;

  constructor(player: AvatarPlayer) {
    super(player);
    this.body = new AvatarBody(this.x, this.y, this);
    this.printManager = new PrintManager(this);
  }

  override update(step: number): void {
    if (this.alive) {
      this.updateAngle(step);
      this.updatePosition(step);

      if (this.printing && this.isTimeToDraw()) {
        this.addPoint(this.x, this.y);
      }
    }
  }

  isTimeToDraw(): boolean {
    if (this.trail.lastX === null) {
      return true;
    }
    return (
      this.getDistance(this.trail.lastX, this.trail.lastY as number, this.x, this.y) > this.radius
    );
  }

  override setPosition(x: number, y: number): void {
    super.setPosition(x, y);
    this.body.x = this.x;
    this.body.y = this.y;
    this.body.num = this.bodyCount;
    this.emit('position', this);
  }

  override setVelocity(velocity: number): void {
    if (this.velocity !== velocity) {
      super.setVelocity(velocity);
      this.emit('property', { avatar: this, property: 'velocity', value: this.velocity });
    }
  }

  override setAngle(angle: number): void {
    if (this.angle !== angle) {
      super.setAngle(angle);
      this.emit('angle', this);
    }
  }

  override setAngularVelocity(angularVelocity: number): void {
    if (this.angularVelocity !== angularVelocity) {
      super.setAngularVelocity(angularVelocity);
    }
  }

  override setRadius(radius: number): void {
    if (this.radius !== radius) {
      super.setRadius(radius);
      this.body.radius = this.radius;
      this.emit('property', { avatar: this, property: 'radius', value: this.radius });
    }
  }

  override setInvincible(invincible: boolean): void {
    super.setInvincible(invincible);
    this.emit('property', { avatar: this, property: 'invincible', value: this.invincible });
  }

  override setGhost(ghost: boolean): void {
    super.setGhost(ghost);
    this.emit('property', { avatar: this, property: 'ghost', value: this.ghost });
  }

  override setInverse(inverse: boolean): void {
    super.setInverse(inverse);
    this.emit('property', { avatar: this, property: 'inverse', value: this.inverse });
  }

  override setColor(color: string): void {
    this.color = color;
    this.emit('property', { avatar: this, property: 'color', value: this.color });
  }

  override setBorderColor(borderColor: string): void {
    this.borderColor = borderColor;
    this.emit('property', { avatar: this, property: 'borderColor', value: this.borderColor });
  }

  override addPoint(x: number, y: number, important?: boolean): void {
    super.addPoint(x, y);
    this.emit('point', { avatar: this, x, y, important });
  }

  override setPrinting(printing: boolean): void {
    super.setPrinting(printing);
    this.emit('property', { avatar: this, property: 'printing', value: this.printing });
  }

  override die(body?: any): void {
    super.die();
    this.printManager.stop();
    this.emit('die', {
      avatar: this,
      killer: body ? body.data : null,
      old: body ? body.isOld() : null,
    });
  }

  override setScore(score: number): void {
    super.setScore(score);
    this.emit('score', this);
  }

  override setRoundScore(score: number): void {
    super.setRoundScore(score);
    this.emit('score:round', this);
  }

  override clear(): void {
    super.clear();
    this.printManager.stop();
    this.bodyCount = 0;
  }
}
