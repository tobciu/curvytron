import BaseBonus from './BaseBonus.js';

export default class BonusEnemyInverse extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusEnemyInverse';
        this.duration = 10000; // 10 seconds
    }

    applyTo(avatar, game) {
        for (let i = game.avatars.items.length - 1; i >= 0; i--) {
            const other = game.avatars.items[i];
            if (other !== avatar) {
                other.setInverse(true);
                setTimeout(() => other.setInverse(false), this.duration);
            }
        }
    }
}
