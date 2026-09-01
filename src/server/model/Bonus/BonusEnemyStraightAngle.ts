import { BonusEnemy } from './BonusEnemy.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusEnemyStraightAngle extends BonusEnemy {
  override duration = 5000;
  static override readonly probability: number = 0.6;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [
      ['directionInLoop', false],
      ['angularVelocityBase', Math.PI / 2],
    ];
  }
  static override getProbability(_game: unknown): number {
    return BonusEnemyStraightAngle.probability;
  }
}
