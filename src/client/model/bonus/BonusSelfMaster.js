import BaseBonus from './BaseBonus.js';

export default class BonusSelfMaster extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusSelfMaster';
        this.duration = 10000; // 10 seconds
    }

    applyTo(avatar, game) {
        avatar.setInvincible(true);
        setTimeout(() => avatar.setInvincible(false), this.duration);
    }
}
