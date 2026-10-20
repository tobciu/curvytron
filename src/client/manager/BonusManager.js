import { Canvas } from '../core/Canvas.js';
import { BaseBonusManager } from '../../shared/manager/BaseBonusManager.js';
import { SpriteAsset } from '../lib/SpriteAsset.js';

/**
 * Bonus Manager
 *
 * @param {Game} game
 */
export class BonusManager extends BaseBonusManager {
    constructor(game) {
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
            this.assets[this.spritePosition[i]] = images[i];
        }

        this.loaded = true;
        this.emit('load');
    }

    /**
     * Remove bonus
     *
     * @param {Bonus} bonus
     */
    remove(bonus) {
        this.clearBonus(bonus);
        super.remove(bonus);
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
     *
     * @param {Canvas} canvas
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
     *
     * @param {Bonus} bonus
     */
    drawBonus(bonus) {
        this.canvas.drawImageScaled(bonus.asset, bonus.drawX, bonus.drawY, bonus.drawWidth, bonus.drawWidth);
    }

    /**
     * Clear bonus from the canvas
     *
     * @param {Bonus} bonus
     */
    clearBonus(bonus) {
        this.canvas.clearZoneScaled(bonus.drawX, bonus.drawY, bonus.drawWidth, bonus.drawWidth);
    }

    /**
     * Set dimension
     *
     * @param {Number} width
     * @param {Float} scale
     */
    setDimension(width, scale) {
        this.canvas.setDimension(width, width, scale);
        this.draw();
    }
}

/**
 * Assets
 *
 * @type {Object}
 */
BonusManager.prototype.assets = {};

/**
 * Bonuses position on the sprite
 *
 * @type {Array}
 */
BonusManager.prototype.spritePosition = [
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
