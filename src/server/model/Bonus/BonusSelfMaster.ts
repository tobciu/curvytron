import { BonusSelf } from './BonusSelf.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusSelfMaster extends BonusSelf {
  override duration = 7500;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [
      ['invincible', true],
      ['printing', -1],
    ];
  }
}
