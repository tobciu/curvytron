import { BonusLeader } from './BonusLeader.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusLeaderInverse extends BonusLeader {
  static override readonly probability: number = 0.8;
  getEffects(_avatar: unknown): BonusEffect[] {
    return [['inverse', 1]];
  }
  static override getProbability(_game: unknown): number {
    return BonusLeader.probability * BonusLeaderInverse.probability;
  }
}
