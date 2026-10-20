import { BaseBonusStack } from '../../shared/model/BaseBonusStack.ts';

/**
 * Game Bonus Stack
 *
 * @param {Game} game
 */
export class GameBonusStack extends BaseBonusStack {
    constructor(game) {
        super(game);
    }

    /**
     * Add bonus to the stack
     *
     * @param {Bonus} bonus
     */
    add(bonus) {
        super.add(bonus);
    }

    /**
     * Remove bonus from the stack
     *
     * @param {Bonus} bonus
     */
    remove(bonus) {
        super.remove(bonus);
    }

    /**
     * Apply the value to target's property
     *
     * @param {String} property
     * @param {Number} value
     */
    apply(property, value) {
        switch (property) {
            case 'borderless':
                this.target.setBorderless(value ? true : false);
                break;
            default:
                super.apply(property, value);
                break;
        }
    }
}
