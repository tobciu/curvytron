import { BaseAvatar } from '../../shared/model/BaseAvatar.js';
import { BaseBonusStack } from '../../shared/model/BaseBonusStack.js';

/**
 * Bonus Stack
 *
 * @param {Avatar} avatar
 */
export class BonusStack extends BaseBonusStack {
    constructor(avatar) {
        super(avatar);
    }

    /**
     * Add bonus to the stack
     *
     * @param {Bonus} bonus
     */
    add(bonus) {
        super.add(bonus);
        this.emit('change', { avatar: this.target, method: 'add', bonus });
    }

    /**
     * Remove bonus from the stack
     *
     * @param {Bonus} bonus
     */
    remove(bonus) {
        super.remove(bonus);
        this.emit('change', { avatar: this.target, method: 'remove', bonus });
    }

    /**
     * Apply the value to target's property
     *
     * @param {String} property
     * @param {Number} value
     */
    apply(property, value) {
        switch (property) {
            case 'radius':
                this.target.setRadius(BaseAvatar.defaults.radius * Math.pow(2, value));
                break;
            case 'velocity':
                this.target.setVelocity(value);
                break;
            case 'inverse':
                this.target.setInverse(value % 2 !== 0);
                break;
            case 'invincible':
                this.target.setInvincible(value ? true : false);
                break;
            case 'ghost':
                this.target.setGhost(value ? true : false);
                break;
            case 'printing':
                this.target.printManager[value > 0 ? 'start' : 'stop']();
                break;
            case 'color':
                this.target.setColor(value);
                break;
            default:
                super.apply(property, value);
                break;
        }
    }

    /**
     * Get default property
     *
     * @param {String} property
     *
     * @return {Number}
     */
    getDefaultProperty(property) {
        switch (property) {
            case 'printing':
                return 1;
            case 'radius':
                return 0;
            case 'color':
                return this.target.player.color;
            default:
                return BaseAvatar.defaults[property];
        }
    }

    /**
     * Append
     *
     * @param {Object} properties
     * @param {String} property
     * @param {Number} value
     */
    append(properties, property, value) {
        switch (property) {
            case 'directionInLoop':
            case 'angularVelocityBase':
            case 'color':
                properties[property] = value;
                break;

            default:
                super.append(properties, property, value);
                break;
        }
    }
}
