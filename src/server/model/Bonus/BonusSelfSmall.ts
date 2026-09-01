import { BonusSelf } from './BonusSelf.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusSelfSmall extends BonusSelf {
  override duration = 7500;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [['radius', -1]];
  }
}
