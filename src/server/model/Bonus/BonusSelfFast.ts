import { BonusSelf } from './BonusSelf.ts';
import { BaseAvatar } from '@shared/model/BaseAvatar.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusSelfFast extends BonusSelf {
  override duration = 4000;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [['velocity', 0.75 * BaseAvatar.velocity]];
  }
}
