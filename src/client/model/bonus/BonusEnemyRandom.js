import BaseBonus from './BaseBonus.js';

export default class BonusEnemyRandom extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusEnemyRandom';
    }

    applyTo(avatar, game) {
        const enemy = game.getRandomEnemy(avatar);
        if (enemy) {
            const bonus = game.bonusManager.getRandomBonus();
            bonus.applyTo(enemy, game);
        }
    }
}
