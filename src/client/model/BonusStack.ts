import { BaseBonusStack } from '@shared/model/BaseBonusStack.ts';
import { Collection } from '@shared/Collection.ts';
import { Canvas } from '../core/Canvas.ts';
import type { StackedBonus } from './bonus/StackedBonus.ts';

/**
 * Client bonus stack: renders the {@link StackedBonus} icons an avatar currently
 * carries into a small strip canvas that the game blits next to the avatar head.
 */
export class BonusStack extends BaseBonusStack {
  /** Icon size (px). */
  static readonly bonusWidth = 20;
  /** How long before expiry a bonus starts blinking (ms). */
  static readonly warning = 1000;

  declare bonuses: Collection<StackedBonus>;

  canvas = new Canvas(0, 0);
  changed = true;
  lastWidth = 0;
  lastHeight = 0;

  constructor(avatar: unknown) {
    super(avatar);
    this.bonuses = new Collection<StackedBonus>();
    this.draw = this.draw.bind(this);
  }

  override add(bonus: StackedBonus): void {
    bonus.on('change', this.draw);
    bonus.setEndingTimeout(BonusStack.warning);
    this.bonuses.add(bonus);
    this.updateDimensions();
  }

  override remove(bonus: StackedBonus): void {
    bonus.clear();
    bonus.off('change', this.draw);
    this.bonuses.remove(bonus);
    this.updateDimensions();
  }

  override clear(): void {
    for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
      this.bonuses.items[i]!.clear();
    }
    super.clear();
    this.updateDimensions();
  }

  updateDimensions(): void {
    this.canvas.setDimension(
      this.bonuses.items.length * BonusStack.bonusWidth,
      BonusStack.bonusWidth,
    );
    this.changed = true;
    this.draw();
  }

  draw(): void {
    if (this.changed) {
      this.canvas.clear();
    }

    const w = BonusStack.bonusWidth;

    for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
      const bonus = this.bonuses.items[i]!;
      if (this.changed || bonus.changed) {
        const x = i * w;
        if (!this.changed) {
          this.canvas.clearZone(x, 0, w, w);
        }
        this.canvas.setOpacity(bonus.opacity);
        if (bonus.asset) {
          this.canvas.drawImage(bonus.asset, x, 0, w, w);
        }
        bonus.changed = false;
      }
    }

    this.canvas.setOpacity(1);
    this.changed = false;
  }
}
