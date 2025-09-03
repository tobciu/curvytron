import BaseBonus from './BaseBonus.js';

export default class BonusEnemySlow extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusEnemySlow';
        this.duration = 5000; // 5 seconds
    }

    applyTo(avatar, game) {
        for (let i = game.avatars.items.length - 1; i >= 0; i--) {
            const other = game.avatars.items[i];
            if (other !== avatar) {
                other.setSpeed(other.speed * 0.5);
                setTimeout(() => other.setSpeed(other.speed / 0.5), this.duration);
            }
        }
    }
}
