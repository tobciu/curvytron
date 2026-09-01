import { BonusSelf } from './BonusSelf.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusSelfBorderless extends BonusSelf {
  override duration = 7500;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [['ghost', true]];
  }
}
