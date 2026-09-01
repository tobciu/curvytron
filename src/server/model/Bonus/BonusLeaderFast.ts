import { BonusLeader } from './BonusLeader.ts';
import { BaseAvatar } from '@shared/model/BaseAvatar.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusLeaderFast extends BonusLeader {
  override duration = 6000;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [['velocity', 0.75 * BaseAvatar.velocity]];
  }
}
