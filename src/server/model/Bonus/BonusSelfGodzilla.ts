import { BonusSelf } from './BonusSelf.ts';
import type { BonusEffect } from '@shared/model/BaseBonusStack.ts';

export class BonusSelfGodzilla extends BonusSelf {
  getEffects(_avatar: unknown): BonusEffect[] {
    return [
      ['invincible', true],
      ['printing', 100],
      ['radius', 10],
      ['velocity', 6],
    ];
  }
}
