import { Bonus } from './Bonus.ts';
import type { BonusAffect } from '@shared/model/BaseBonus.ts';

/** Affects the current leader(s) — the highest-scoring alive avatar(s), excluding the picker. */
export class BonusLeader extends Bonus {
  static override readonly probability: number = 0.5;

  affect: BonusAffect = 'leader';

  getTarget(avatar: any, game: any): any {
    const sorted = game.sortAvatars(
      game.avatars.filter(function (this: any) {
        return this.alive && !this.equal(avatar);
      }),
    );
    const leader = sorted.getFirst();
    if (leader !== null) {
      return sorted.filter(function (this: any) {
        return this.score === leader.score;
      }).items;
    }
    return [];
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

  static override getProbability(game: any): number {
    const leader = game
      .sortAvatars(
        game.avatars.filter(function (this: any) {
          return this.alive;
        }),
      )
      .getFirst();
    if (leader === null || leader.score === 0) {
      return 0;
    }
    return BonusLeader.probability;
  }
}
