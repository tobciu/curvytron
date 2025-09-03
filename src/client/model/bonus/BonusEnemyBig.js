import BaseBonus from './BaseBonus.js';

export default class BonusEnemyBig extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusEnemyBig';
        this.duration = 10000; // 10 seconds
    }

    applyTo(avatar, game) {
        for (let i = game.avatars.items.length - 1; i >= 0; i--) {
            const other = game.avatars.items[i];
            if (other !== avatar) {
                other.setRadius(other.radius * 2);
                setTimeout(() => other.setRadius(other.radius / 2), this.duration);
            }
        }
    }
}
