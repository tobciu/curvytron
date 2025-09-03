import BaseBonus from './BaseBonus.js';

export default class BonusSelfSmall extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusSelfSmall';
        this.duration = 10000; // 10 seconds
    }

    applyTo(avatar, game) {
        avatar.setRadius(avatar.radius / 2);
        setTimeout(() => avatar.setRadius(avatar.radius * 2), this.duration);
    }
}
