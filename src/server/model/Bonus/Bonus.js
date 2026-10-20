import { Body } from '../../core/Body.js';
import { BaseBonus } from '../../../shared/model/BaseBonus.ts';

/**
 * Bonus
 *
 * @param {Number} x
 * @param {Number} y
 */
export class Bonus extends BaseBonus {
    constructor(x, y) {
        super(x, y);

        this.body = new Body(this.x, this.y, this.radius, this);
        this.target = null;
        this.timeout = null;
    }

    /**
     * Apply bonus callback
     */
    applyTo(avatar, game) {
        this.target = this.getTarget(avatar, game);

        if (this.duration) {
            this.timeout = setTimeout(this.off, this.duration);
        }

        this.on();
    }
}
