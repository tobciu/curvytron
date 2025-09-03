import BaseBonus from './BaseBonus.js';

export default class BonusGameClear extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusGameClear';
    }

    applyTo(avatar, game) {
        game.clearTrails();
    }
}
