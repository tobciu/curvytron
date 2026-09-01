import { BonusGame } from './BonusGame.ts';

/**
 * Instantly wipes every trail. No stacked effect (overrides `on` directly);
 * likelier the more players are already dead.
 */
export class BonusGameClear extends BonusGame {
  override duration = 0;

  static override getProbability(game: any): number {
    const ratio = 1 - game.getAliveAvatars().count() / game.getPresentAvatars().count();
    return Math.round(ratio * 10) / 10;
  }

  override on(): void {
    this.target.clearTrails();
  }
}
