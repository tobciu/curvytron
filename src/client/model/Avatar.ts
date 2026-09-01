import { BaseAvatar } from '@shared/model/BaseAvatar.ts';
import { Canvas } from '../core/Canvas.ts';
import { PlayerInput, type Binding } from './PlayerInput.ts';
import { Trail } from './Trail.ts';
import { BonusStack } from './BonusStack.ts';

/** What the client Avatar needs of its owning player. */
export interface AvatarOwner {
  id: string | number;
  name: string;
  color: string;
  local: boolean;
  getBinding(): Binding[];
}

/**
 * Client-side avatar: keeps the server-authoritative position/angle, renders its
 * head + direction arrow to small offscreen canvases, and (for local players)
 * owns a {@link PlayerInput} that turns key/touch state into `move` events.
 */
export class Avatar extends BaseAvatar {
  static override readonly TrailClass = Trail;
  static override readonly BonusStackClass = BonusStack;

  /** Arrow stroke width (percent of arrow canvas). */
  static readonly arrowWidth = 3;
  /** Arrow canvas size (px). */
  static readonly arrowSize = 200;

  declare trail: Trail;
  declare bonusStack: BonusStack;

  local: boolean;
  canvas = new Canvas(100, 100);
  arrow = new Canvas(Avatar.arrowSize, Avatar.arrowSize);
  width: number;
  canvasWidth: number;
  canvasRadius: number;
  clearWidth: number;
  startX = 0;
  startY = 0;
  clearX = 0;
  clearY = 0;
  changed = false;
  input: PlayerInput | null = null;

  constructor(player: AvatarOwner) {
    super(player);

    this.local = player.local;
    this.width = this.radius * 2;
    this.canvasWidth = this.canvas.element.width;
    this.canvasRadius = this.canvasWidth / 2;
    this.clearWidth = this.canvasWidth;

    if (this.local) {
      this.input = new PlayerInput(this, player.getBinding());
    }

    this.drawArrow();
  }

  override update(step: number): void {
    if (!this.changed && this.alive) {
      this.updateAngle(step);
      this.updatePosition(step);
    }

    this.startX = this.canvas.round(this.x * this.canvas.scale - this.canvasRadius);
    this.startY = this.canvas.round(this.y * this.canvas.scale - this.canvasRadius);
    this.changed = false;
  }

  /** Apply an authoritative position from the server. */
  setPositionFromServer(x: number, y: number): void {
    super.setPosition(x, y);
    this.changed = true;
    if (this.printing) {
      this.addPoint(x, y);
    }
  }

  setScale(scale: number): void {
    const width = Math.ceil(this.width * scale);
    this.canvas.setDimension(width, width, scale);
    this.changed = true;
    this.canvasWidth = this.canvas.element.width;
    this.canvasRadius = this.canvas.element.width / 2;
    this.drawHead();
  }

  override setRadius(radius: number): void {
    super.setRadius(radius);
    this.updateWidth();
    this.drawHead();
  }

  override setColor(color: string): void {
    super.setColor(color);
    this.drawHead();
  }

  override setBorderColor(borderColor: string): void {
    super.setBorderColor(borderColor);
    this.drawHead();
  }

  override setScore(score: number): void {
    const diff = score - this.score;
    super.setScore(score);
    this.roundScore = diff;
  }

  override die(): void {
    super.die();
    this.emit('die', this);
  }

  drawHead(): void {
    this.canvas.clear();
    this.canvas.drawCircle(
      this.canvasRadius,
      this.canvasRadius,
      this.radius * this.canvas.scale,
      this.color,
      this.borderColor,
    );
  }

  drawArrow(): void {
    const s = Avatar.arrowSize;
    const arrowLines: Array<Array<[number, number]>> = [
      [
        [s * 0.65, s * 0.5],
        [s * 0.95, s * 0.5],
      ],
      [
        [s * 0.85, s * 0.4],
        [s * 0.95, s * 0.5],
        [s * 0.85, s * 0.6],
      ],
    ];

    this.arrow.clear();

    for (let i = arrowLines.length - 1; i >= 0; i--) {
      this.arrow.drawLine(arrowLines[i]!, (s * Avatar.arrowWidth) / 100, this.color, 'round');
    }
  }

  updateWidth(): void {
    this.width = this.radius * 2;
    this.setScale(this.canvas.scale);
  }

  override destroy(): void {
    this.trail.clear();
    this.canvas.clear();
    this.arrow.clear();

    if (this.input) {
      this.input.detachEvents();
      this.input = null;
    }

    super.destroy();
  }

  override clear(): void {
    super.clear();
    this.updateWidth();
    this.drawHead();
  }

  /** Generic `set<Property>` dispatch used by the `property` wire event. */
  set(property: string, value: unknown): void {
    const method = 'set' + property[0]!.toUpperCase() + property.slice(1);
    const fn = (this as unknown as Record<string, unknown>)[method];
    if (typeof fn === 'function') {
      (fn as (v: unknown) => void).call(this, value);
    } else {
      throw new Error('Unknown setter ' + method);
    }
  }

  hasBonus(): boolean {
    return !this.bonusStack.bonuses.isEmpty();
  }
}
