import { BonusEnemy } from './BonusEnemy.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusEnemyBig extends BonusEnemy {
  override duration = 7500;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [['radius', 1]];
  }
}
