import { BaseBonusManager } from '@shared/manager/BaseBonusManager.ts';
import { Canvas } from '../core/Canvas.ts';
import { SpriteAsset } from '../lib/SpriteAsset.ts';
import type { MapBonus } from '../model/bonus/MapBonus.ts';

/**
 * Client bonus manager: loads the bonus sprite sheet, keeps a `type → icon`
 * map, and renders the map bonuses onto their own canvas layer.
 */
export class BonusManager extends BaseBonusManager {
  /** Order of the bonus icons on `web/images/bonus.png` (3 × 7 grid). */
  static readonly spritePosition = [
    'BonusSelfFast',
    'BonusEnemyFast',
    'BonusSelfSlow',
    'BonusEnemySlow',
    'BonusGameBorderless',
    'BonusSelfMaster',
    'BonusEnemyBig',
    'BonusAllColor',
    'BonusEnemyInverse',
    'BonusSelfSmall',
    'BonusGameClear',
    'BonusEnemyStraightAngle',
    'BonusSelfRandom',
    'BonusLeaderRandom',
    'BonusEnemyRandom',
    'BonusLeaderFast',
    'BonusLeaderInverse',
    'BonusLeaderSlow',
    'BonusSelfBorderless',
  ];

  declare bonuses: import('@shared/Collection.ts').Collection<MapBonus>;

  assets: Record<string, HTMLCanvasElement> = {};
  loaded = false;
  canvas: Canvas | null = null;
  private sprite: SpriteAsset;

  constructor(game: unknown, _bonuses?: unknown[], _rate?: number) {
    super(game);
    this.onLoad = this.onLoad.bind(this);
    this.sprite = new SpriteAsset('images/bonus.png', 3, 7, this.onLoad, true);
  }

  /** Bind the DOM canvas this layer draws to. */
  attachCanvas(element: HTMLCanvasElement): void {
    this.canvas = new Canvas(0, 0, element);
  }

  onLoad(): void {
    const images = this.sprite.getImages();
    for (let i = BonusManager.spritePosition.length - 1; i >= 0; i--) {
      this.assets[BonusManager.spritePosition[i]!] = images[i]!;
    }
    this.loaded = true;
    this.emit('load');
  }

  override remove(bonus: MapBonus): boolean {
    this.clearBonus(bonus);
    return super.remove(bonus);
  }

  override clear(): void {
    this.canvas?.clear();
    super.clear();
  }

  draw(): void {
    if (!this.canvas) {
      return;
    }

    for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
      const bonus = this.bonuses.items[i]!;
      if (!bonus.animation.done && bonus.drawWidth) {
        this.clearBonus(bonus);
      }
    }

    for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
      const bonus = this.bonuses.items[i]!;
      if (!bonus.animation.done) {
        bonus.update();
        this.drawBonus(bonus);
      }
    }
  }

  drawBonus(bonus: MapBonus): void {
    if (bonus.asset) {
      this.canvas!.drawImageScaled(bonus.asset, bonus.drawX, bonus.drawY, bonus.drawWidth, bonus.drawWidth);
    }
  }

  clearBonus(bonus: MapBonus): void {
    this.canvas?.clearZoneScaled(bonus.drawX, bonus.drawY, bonus.drawWidth, bonus.drawWidth);
  }

  setDimension(width: number, scale: number): void {
    if (this.canvas) {
      this.canvas.setDimension(width, width, scale);
      this.draw();
    }
  }
}
