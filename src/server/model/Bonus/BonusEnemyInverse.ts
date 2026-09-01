import { BonusEnemy } from './BonusEnemy.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusEnemyInverse extends BonusEnemy {
  static override readonly probability: number = 0.8;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [['inverse', 1]];
  }
  static override getProbability(_game: unknown): number {
    return BonusEnemyInverse.probability;
  }
}
