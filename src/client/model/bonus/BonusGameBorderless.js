import BaseBonus from './BaseBonus.js';

export default class BonusGameBorderless extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusGameBorderless';
        this.duration = 10000; // 10 seconds
    }

    applyTo(avatar, game) {
        game.setBorderless(true);
        setTimeout(() => game.setBorderless(false), this.duration);
    }
}
