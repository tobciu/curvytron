import { BaseBonus } from '@shared/model/BaseBonus.ts';
import { BounceIn } from '../../animation/BounceIn.ts';

/**
 * A bonus sitting on the map, waiting to be picked up. Drawn by the client
 * {@link BonusManager} with a short bounce-in animation.
 */
export class MapBonus extends BaseBonus {
  override id: number;
  asset: CanvasImageSource | undefined;
  animation = new BounceIn(300);
  changed = true;
  drawRadius = 0;
  drawWidth = 0;
  drawX = 0;
  drawY = 0;

  constructor(id: number, x: number, y: number, asset: CanvasImageSource | undefined) {
    super(x, y);
    this.id = id;
    this.asset = asset;
    this.update();
  }

  /** Recompute the draw geometry from the current animation value. */
  update(): void {
    this.drawRadius = this.radius * this.animation.getValue();
    this.drawWidth = this.drawRadius * 2;
    this.drawX = this.x - this.drawRadius;
    this.drawY = this.y - this.drawRadius;
  }
}
