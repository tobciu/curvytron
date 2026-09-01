import { BonusEnemy } from './BonusEnemy.ts';
import { BaseAvatar } from '@shared/model/BaseAvatar.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusEnemySlow extends BonusEnemy {
  getEffects(_avatar: unknown): BonusEffect[] {
    return [['velocity', -BaseAvatar.velocity / 2]];
  }
}
