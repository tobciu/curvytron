import { BonusAll } from './BonusAll.js';

/**
 * Big All Color
 *
 * @param {Number} x
 * @param {Number} y
 */
export class BonusAllColor extends BonusAll {
    constructor(x, y) {
        super(x, y);

        this.getColor = this.getColor.bind(this);
    }

    /**
     * Get target
     *
     * @param {Avatar} avatar
     * @param {Game} game
     *
     * @return {Object}
     */
    getTarget(avatar, game) {
        const targets = super.getTarget(avatar, game);

        this.avatars = new Array(targets.length);
        this.colors = new Array(targets.length);

        for (let i = targets.length - 1; i >= 0; i--) {
            this.avatars[i] = targets[i].id;
            this.colors[i] = targets[i].color;
        }

        return targets;
    }

    /**
     * Get effects
     *
     * @param {Avatar} avatar
     *
     * @return {Array}
     */
    getEffects(avatar) {
        return [['color', this.getColor(avatar)]];
    }

    /**
     * Get color
     *
     * @param {Avatar} avatar
     *
     * @return {String}
     */
    getColor(avatar) {
        const index = this.avatars.indexOf(avatar.id);

        return this.colors[(index + 1) % this.colors.length];
    }
}

/**
 * Duration
 *
 * @type {Number}
 */
BonusAllColor.prototype.duration = 7500;
