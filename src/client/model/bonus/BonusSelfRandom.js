import BaseBonus from './BaseBonus.js';

export default class BonusSelfRandom extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusSelfRandom';
    }

    applyTo(avatar, game) {
        const bonus = game.bonusManager.getRandomBonus();
        bonus.applyTo(avatar, game);
    }
}
