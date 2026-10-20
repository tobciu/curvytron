import { Canvas } from '../core/Canvas.js';
import { BaseBonusStack } from '../../shared/model/BaseBonusStack.js';

/**
 * Bonus Stack
 *
 * @param {Avatar} avatar
 */
export class BonusStack extends BaseBonusStack {
    constructor(avatar) {
        super(avatar);

        this.canvas = new Canvas(this.width, this.width);
        this.changed = true;
        this.lastWidth = this.width;
        this.lastHeight = this.width;

        this.draw = this.draw.bind(this);
    }

    /**
     * Add bonus to the stack
     *
     * @param {Bonus} bonus
     */
    add(bonus) {
        bonus.on('change', this.draw);
        bonus.setEndingTimeout(this.warning);
        this.bonuses.add(bonus);
        this.updateDimensions();
    }

    /**
     * Remove bonus from the stack
     *
     * @param {Bonus} bonus
     */
    remove(bonus) {
        bonus.clear();
        bonus.off('change', this.draw);
        this.bonuses.remove(bonus);
        this.updateDimensions();
    }

    /**
     * Clear
     */
    clear() {
        for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
            this.bonuses.items[i].clear();
        }

        super.clear();
        this.updateDimensions();
    }

    /**
     * Update dimensions
     */
    updateDimensions() {
        this.canvas.setDimension(this.bonuses.items.length * this.bonusWidth, this.bonusWidth);
        this.changed = true;
        this.draw();
    }

    /**
     * Draw
     */
    draw(e) {
        if (this.changed) {
            this.canvas.clear();
        }

        for (let bonus, x, i = this.bonuses.items.length - 1; i >= 0; i--) {
            bonus = this.bonuses.items[i];
            if (this.changed || bonus.changed) {
                x = i * this.bonusWidth;
                if (!this.changed) {
                    this.canvas.clearZone(x, 0, this.bonusWidth, this.bonusWidth);
                }
                this.canvas.setOpacity(bonus.opacity);
                this.canvas.drawImage(bonus.asset, x, 0, this.bonusWidth, this.bonusWidth);
                bonus.changed = false;
            }
        }

        this.changed = false;
    }
}

/**
 * Bonus width
 *
 * @type {Number}
 */
BonusStack.prototype.bonusWidth = 20;

/**
 * Warning time
 *
 * @type {Number}
 */
BonusStack.prototype.warning = 1000;
