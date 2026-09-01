import { Bonus } from './Bonus.ts';
import type { BonusAffect } from '@shared/model/BaseBonus.ts';

/** Affects the game itself (borderless, clear-all). */
export class BonusGame extends Bonus {
  affect: BonusAffect = 'game';

  getTarget(_avatar: any, game: any): any {
    return game;
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
