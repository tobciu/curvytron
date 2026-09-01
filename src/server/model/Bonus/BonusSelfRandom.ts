import { BonusSelf } from './BonusSelf.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusSelfRandom extends BonusSelf {
  override duration = 7500;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [
      ['directionInLoop', false],
      ['angularVelocityBase', Math.PI / 4],
    ];
  }
}
