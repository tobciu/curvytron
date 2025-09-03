import BaseBonus from './BaseBonus.js';

export default class BonusLeaderSlow extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusLeaderSlow';
        this.duration = 5000; // 5 seconds
    }

    applyTo(avatar, game) {
        const leader = game.getLeader();
        if (leader) {
            leader.setSpeed(leader.speed * 0.5);
            setTimeout(() => leader.setSpeed(leader.speed / 0.5), this.duration);
        }
    }
}
