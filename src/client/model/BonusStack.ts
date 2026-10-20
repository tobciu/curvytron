import type { Avatar } from './Avatar.ts';
import { Canvas } from '../core/Canvas.ts';
import type { StackedBonus } from './bonus/StackedBonus.ts';
import { BaseBonusStack } from '../../shared/model/BaseBonusStack.ts';

/**
 * Bonus Stack
 */
export class BonusStack extends BaseBonusStack<StackedBonus> {
    canvas: Canvas;
    changed: boolean;
    lastWidth: number;
    lastHeight: number;

    /**
     * Bonus width
     */
    bonusWidth: number = 20;

    /**
     * Warning time
     */
    warning: number = 1000;

    constructor(avatar: Avatar) {
        super(avatar);

        this.canvas = new Canvas();
        this.changed = true;
        this.lastWidth = 0;
        this.lastHeight = 0;

        this.draw = this.draw.bind(this);
    }

    /**
     * Add bonus to the stack
     */
    add(bonus: any) {
        bonus.on('change', this.draw);
        bonus.setEndingTimeout(this.warning);
        this.bonuses.add(bonus);
        this.updateDimensions();
    }

    /**
     * Remove bonus from the stack
     */
    remove(bonus: any) {
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
    draw(e?: any) {
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
