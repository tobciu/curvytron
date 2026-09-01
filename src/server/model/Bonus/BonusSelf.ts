import { Bonus } from './Bonus.ts';
import type { BonusAffect } from '@shared/model/BaseBonus.ts';

/** Affects the avatar who picked it up. */
export class BonusSelf extends Bonus {
  affect: BonusAffect = 'self';

  getTarget(avatar: any, _game: any): any {
    return avatar.alive ? avatar : null;
  }

  on(): void {
    if (this.target) {
      this.target.bonusStack.add(this);
    }
  }

  off(): void {
    if (this.target) {
      this.target.bonusStack.remove(this);
    }
  }
}
