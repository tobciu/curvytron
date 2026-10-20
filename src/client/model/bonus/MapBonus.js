import { BounceIn } from '../../animation/BounceIn.js';
import { BonusManager } from '../../manager/BonusManager.js';
import { BaseBonus } from '../../../shared/model/BaseBonus.ts';

/**
 * Map Bonus
 *
 * @param {Number} id
 * @param {Number} x
 * @param {Number} y
 * @param {String} type
 * @param {Number} radius
 */
export class MapBonus extends BaseBonus {
    /**
     * Assets
     *
     * @type {Object}
     */
    constructor(id, x, y, type) {
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
