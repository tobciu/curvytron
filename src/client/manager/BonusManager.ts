import type { Collection } from '../../shared/Collection.ts';
import type { MapBonus } from '../model/bonus/MapBonus.ts';
import { bonusDefinitions, spriteColumns, spriteLines } from '../../shared/bonuses.ts';
import { Canvas } from '../core/Canvas.ts';
import { BaseBonusManager } from '../../shared/manager/BaseBonusManager.ts';
import { SpriteAsset } from '../lib/SpriteAsset.ts';

/** The ring of a bonus that goes away: its radius (times the radius of the bonus), its width and its colors */
const ringFactor = 1.5;
const ringWidth = 0.2;
const ringColor = '#ffd700';
const ringWarningColor = '#ff4d4d';

/**
 * Bonus Manager
 */
export class BonusManager extends BaseBonusManager {
    loaded: boolean;
    sprite: any;
    // Created by `loadDOM()`
    canvas!: Canvas;
    declare bonuses: Collection<MapBonus>;

    /**
     * Assets
     */
    static assets: any = {};

    assets: any = BonusManager.assets;

    /**
     * Bonuses position on the sprite
     */
    spritePosition: string[] = bonusDefinitions.map(({ name }) => name);

    constructor(game: any) {
        super(game);

        this.bonuses.index = false;

        this.onLoad = this.onLoad.bind(this);

        this.loaded = false;
        this.sprite = new SpriteAsset('images/bonus.png', spriteColumns, spriteLines(), this.onLoad, true);
    }

    /**
     * Load DOM
     */
    loadDOM() {
        this.canvas = new Canvas(0, 0, document.getElementById('bonus'));
    }

    /**
     * On bonus sprite loaded
     */
    onLoad() {
        const images = this.sprite.getImages();

        for (let i = this.spritePosition.length - 1; i >= 0; i--) {
            BonusManager.assets[this.spritePosition[i]] = images[i];
        }

        this.loaded = true;
        this.emit('load');
    }

    /**
     * Remove bonus
     */
    override remove(bonus: MapBonus) {
        this.clearBonus(bonus);

        return super.remove(bonus);
    }

    /**
     * Clear
     */
    override clear() {
        this.canvas.clear();
        super.clear();
    }

    /**
     * Draw
     */
    draw() {
        // A bonus with a ring is drawn again in every frame: the ring shrinks with its time
        for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
            const bonus = this.bonuses.items[i];
            if ((!bonus.animation.done && bonus.drawWidth) || bonus.expiresAt !== null) {
                this.clearBonus(bonus);
            }
        }

        const now = Date.now();

        for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
            const bonus = this.bonuses.items[i];
            if (!bonus.animation.done || bonus.expiresAt !== null) {
                bonus.update();
                this.drawBonus(bonus);

                if (bonus.expiresAt !== null) {
                    this.drawRing(bonus, now);
                }
            }
        }
    }

    /**
     * Draw the ring of a bonus that goes away: it is full when the bonus appears and shrinks until it is gone, and gets
     * red for the last quarter.
     */
    drawRing(bonus: MapBonus, now: number) {
        const remaining = bonus.getRemaining(now);
        const context = this.canvas.context;
        const scale = this.canvas.scale;
        const radius = bonus.drawRadius * ringFactor;

        context.save();
        context.lineWidth = Math.max(ringWidth * scale, 1);
        context.lineCap = 'round';
        context.strokeStyle = remaining > 0.25 ? ringColor : ringWarningColor;
        context.beginPath();
        context.arc(
            bonus.x * scale,
            bonus.y * scale,
            radius * scale,
            -Math.PI / 2,
            -Math.PI / 2 + remaining * 2 * Math.PI
        );
        context.stroke();
        context.restore();
    }

    /**
     * Draw bonus
     */
    drawBonus(bonus: any) {
        this.canvas.drawImageScaled(bonus.asset, bonus.drawX, bonus.drawY, bonus.drawWidth, bonus.drawWidth);
    }

    /**
     * Clear bonus from the canvas
     */
    clearBonus(bonus: any) {
        // The ring is larger than the bonus
        const pad = bonus.expiresAt === null ? 0 : bonus.drawRadius * (ringFactor - 1) + ringWidth;

        this.canvas.clearZoneScaled(
            bonus.drawX - pad,
            bonus.drawY - pad,
            bonus.drawWidth + 2 * pad,
            bonus.drawWidth + 2 * pad
        );
    }

    /**
     * Set dimension
     */
    setDimension(width: number, scale: number) {
        this.canvas.setDimension(width, width, scale);
        this.draw();
    }
}
