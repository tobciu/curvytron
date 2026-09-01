import { BonusLeader } from './BonusLeader.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusLeaderRandom extends BonusLeader {
  override duration = 7500;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [
      ['directionInLoop', false],
      ['angularVelocityBase', Math.PI / 4],
    ];
  }
}
