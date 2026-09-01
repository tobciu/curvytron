import { BonusEnemy } from './BonusEnemy.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusEnemyRandom extends BonusEnemy {
  override duration = 7500;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [
      ['directionInLoop', false],
      ['angularVelocityBase', Math.PI / 4],
    ];
  }
}
