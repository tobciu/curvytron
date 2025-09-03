import BaseBonusStack from '../../shared/model/BaseBonusStack.js';

/**
 * Game Bonus Stack
 */
class GameBonusStack extends BaseBonusStack {
    /**
     * Apply the value to target's property
     *
     * @param {String} property
     * @param {Number} value
     */
    apply(property, value) {
        switch (property) {
            case 'borderless':
                this.target.setBorderless(!!value);
                break;
            default:
                super.apply(property, value);
                break;
        }
    }
}

export default GameBonusStack;
