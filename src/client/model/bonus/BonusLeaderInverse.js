import BaseBonus from './BaseBonus.js';

export default class BonusLeaderInverse extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusLeaderInverse';
        this.duration = 10000; // 10 seconds
    }

    applyTo(avatar, game) {
        const leader = game.getLeader();
        if (leader) {
            leader.setInverse(true);
            setTimeout(() => leader.setInverse(false), this.duration);
        }
    }
}
