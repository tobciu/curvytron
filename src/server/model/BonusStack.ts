import { BaseAvatar } from '../../shared/model/BaseAvatar.ts';
import { BaseBonusStack } from '../../shared/model/BaseBonusStack.ts';
import type { Bonus } from './Bonus/Bonus.ts';

/**
 * Bonus Stack
 */
export class BonusStack extends BaseBonusStack {
    constructor(avatar: any) {
        super(avatar);
    }

    /**
     * Add bonus to the stack
     */
    override add(bonus: Bonus) {
        super.add(bonus);
        this.emit('change', { avatar: this.target, method: 'add', bonus });
    }

    /**
     * Remove bonus from the stack
     */
    override remove(bonus: Bonus) {
        super.remove(bonus);
        this.emit('change', { avatar: this.target, method: 'remove', bonus });
    }

    /**
     * Apply the value to target's property
     */
    override apply(property: string, value: number) {
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
                this.target.setInvincible(!!value);
                break;
            case 'ghost':
                this.target.setGhost(!!value);
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
     */
    override getDefaultProperty(property: string): number {
        switch (property) {
            case 'printing':
                return 1;
            case 'radius':
                return 0;
            case 'color':
                return this.target.player.color;
            default:
                return (BaseAvatar.defaults as unknown as Record<string, number>)[property];
        }
    }

    /**
     * Append
     */
    override append(properties: any, property: string, value: number) {
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
