import BaseBonus from './BaseBonus.js';

export default class BonusLeaderRandom extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusLeaderRandom';
    }

    applyTo(avatar, game) {
        const leader = game.getLeader();
        if (leader) {
            const bonus = game.bonusManager.getRandomBonus();
            bonus.applyTo(leader, game);
        }
    }
}
