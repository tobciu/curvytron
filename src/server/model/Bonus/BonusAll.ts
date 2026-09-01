import { Bonus } from './Bonus.ts';
import type { BonusAffect } from '@shared/model/BaseBonus.ts';

/** Affects every alive avatar. */
export class BonusAll extends Bonus {
  affect: BonusAffect = 'all';

  getTarget(avatar: any, game: any): any {
    return game.avatars.filter(function (this: any) {
      return this.alive;
    }).items;
  }

  on(): void {
    for (let i = this.target.length - 1; i >= 0; i--) {
      this.target[i].bonusStack.add(this);
    }
  }

  off(): void {
    for (let i = this.target.length - 1; i >= 0; i--) {
      this.target[i].bonusStack.remove(this);
    }
  }
}
