import BaseBonus from './BaseBonus.js';

export default class BonusSelfBorderless extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusSelfBorderless';
        this.duration = 10000; // 10 seconds
    }

    applyTo(avatar, game) {
        avatar.setBorderless(true);
        setTimeout(() => avatar.setBorderless(false), this.duration);
    }
}
