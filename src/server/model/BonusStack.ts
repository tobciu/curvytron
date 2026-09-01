import { BaseBonusStack, type BonusEffectValue } from '@shared/model/BaseBonusStack.ts';
import { BaseAvatar } from '@shared/model/BaseAvatar.ts';
import type { Avatar } from './Avatar.ts';

/**
 * An avatar's bonus stack — maps merged effect values onto the avatar's setters
 * and knows each property's "no bonus" default.
 */
export class BonusStack extends BaseBonusStack<Avatar> {
  override add(bonus: any): void {
    super.add(bonus);
    this.emit('change', { avatar: this.target, method: 'add', bonus });
  }

  override remove(bonus: any): void {
    super.remove(bonus);
    this.emit('change', { avatar: this.target, method: 'remove', bonus });
  }

  override apply(property: string, value: BonusEffectValue): void {
    switch (property) {
      case 'radius':
        this.target.setRadius(BaseAvatar.radius * Math.pow(2, value as number));
        break;
      case 'velocity':
        this.target.setVelocity(value as number);
        break;
      case 'inverse':
        this.target.setInverse((value as number) % 2 !== 0);
        break;
      case 'invincible':
        this.target.setInvincible(value ? true : false);
        break;
      case 'ghost':
        this.target.setGhost(value ? true : false);
        break;
      case 'printing':
        this.target.printManager[(value as number) > 0 ? 'start' : 'stop']();
        break;
      case 'color':
        this.target.setColor(value as string);
        break;
      default:
        super.apply(property, value);
        break;
    }
  }

  override getDefaultProperty(property: string): BonusEffectValue {
    switch (property) {
      case 'printing':
        return 1;
      case 'radius':
        return 0;
      case 'color':
        return this.target.player.color;
      default:
        return (BaseAvatar as any)[property] as BonusEffectValue;
    }
  }

  override append(
    properties: Record<string, BonusEffectValue>,
    property: string,
    value: BonusEffectValue,
  ): void {
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
