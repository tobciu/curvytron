import BaseBonus from './BaseBonus.js';

export default class BonusSelfSlow extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusSelfSlow';
        this.duration = 5000; // 5 seconds
    }

    applyTo(avatar, game) {
        avatar.setSpeed(avatar.speed * 0.5);
        setTimeout(() => avatar.setSpeed(avatar.speed / 0.5), this.duration);
    }
}
