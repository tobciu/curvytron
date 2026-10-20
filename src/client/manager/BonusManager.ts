import type { Collection } from '../../shared/Collection.ts';
import type { MapBonus } from '../model/bonus/MapBonus.ts';
import { Canvas } from '../core/Canvas.ts';
import { BaseBonusManager } from '../../shared/manager/BaseBonusManager.ts';
import { SpriteAsset } from '../lib/SpriteAsset.js';

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
    spritePosition: any[] = [
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
        'BonusSelfBorderless'
    ];

    constructor(game: any) {
        super(game);

        this.bonuses.index = false;

        this.onLoad = this.onLoad.bind(this);

        this.loaded = false;
        this.sprite = new SpriteAsset('images/bonus.png', 3, 7, this.onLoad, true);
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
    remove(bonus: MapBonus) {
        this.clearBonus(bonus);

        return super.remove(bonus);
    }

    /**
     * Clear
     */
    clear() {
        this.canvas.clear();
        super.clear();
    }

    /**
     * Draw
     */
    draw() {
        for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
            const bonus = this.bonuses.items[i];
            if (!bonus.animation.done && bonus.drawWidth) {
                this.clearBonus(bonus);
            }
        }

        for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
            const bonus = this.bonuses.items[i];
            if (!bonus.animation.done) {
                bonus.update();
                this.drawBonus(bonus);
            }
        }
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
        this.canvas.clearZoneScaled(bonus.drawX, bonus.drawY, bonus.drawWidth, bonus.drawWidth);
    }

    /**
     * Set dimension
     */
    setDimension(width: number, scale: number) {
        this.canvas.setDimension(width, width, scale);
        this.draw();
    }
}
