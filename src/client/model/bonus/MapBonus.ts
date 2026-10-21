import { BounceIn } from '../../animation/BounceIn.ts';
import { BonusManager } from '../../manager/BonusManager.ts';
import { BaseBonus } from '../../../shared/model/BaseBonus.ts';

/**
 * Map Bonus
 */
export class MapBonus extends BaseBonus {
    override id: any;
    asset: any;
    animation: BounceIn;
    changed: boolean;
    drawRadius: number;
    drawWidth: number;
    drawX: number;
    drawY: number;

    /**
     * Assets
     */
    constructor(id: any, x: any, y: any, type: any) {
        super(x, y);

        this.id = id;
        this.asset = BonusManager.assets[type];
        this.animation = new BounceIn(300);
        this.changed = true;
        this.drawRadius = 0;
        this.drawWidth = 0;
        this.drawX = 0;
        this.drawY = 0;

        this.update();
    }

    /**
     * Update bonus for drawing
     */
    update() {
        this.drawRadius = this.radius * this.animation.getValue();
        this.drawWidth = this.drawRadius * 2;
        this.drawX = this.x - this.drawRadius;
        this.drawY = this.y - this.drawRadius;
    }
}
