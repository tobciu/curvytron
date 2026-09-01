import { BonusSelf } from './BonusSelf.ts';
import { BaseAvatar } from '@shared/model/BaseAvatar.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusSelfSlow extends BonusSelf {
  getEffects(_avatar: unknown): BonusEffect[] {
    return [['velocity', -BaseAvatar.velocity / 2]];
  }
}
