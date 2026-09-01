import { BonusLeader } from './BonusLeader.ts';
import { BaseAvatar } from '@shared/model/BaseAvatar.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusLeaderSlow extends BonusLeader {
  getEffects(_avatar: unknown): BonusEffect[] {
    return [['velocity', -BaseAvatar.velocity / 2]];
  }
}
