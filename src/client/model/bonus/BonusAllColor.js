import BaseBonus from './BaseBonus.js';

export default class BonusAllColor extends BaseBonus {
    constructor(id, x, y, asset) {
        super(id, x, y, asset);
        this.constructor.name = 'BonusAllColor';
    }

    applyTo(avatar, game) {
        for (let i = game.avatars.items.length - 1; i >= 0; i--) {
            const avatar = game.avatars.items[i];
            avatar.setColor(this.getRandomColor());
        }
    }

    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
}
