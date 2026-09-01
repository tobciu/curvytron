import { BonusGame } from './BonusGame.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusGameBorderless extends BonusGame {
  override duration = 10000;
  static override readonly probability: number = 0.8;
  getEffects(_game: unknown): BonusEffect[] {
    return [['borderless', true]];
  }
  static override getProbability(_game: unknown): number {
    return BonusGameBorderless.probability;
  }
}
