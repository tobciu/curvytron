import { EventEmitter } from 'eventemitter3';
import { Collection } from '../Collection.ts';

/** What the manager needs of a bonus. */
export interface ManagedBonus {
  id: number | null;
  clear(): void;
}

/**
 * Owns the bonuses currently on the map. The server subclass adds the spawn
 * timer, weighted type selection and pickup tests.
 */
export class BaseBonusManager extends EventEmitter {
  /** Max bonuses on the map at once. */
  static readonly bonusCap = 20;
  /** Base interval between spawns (ms); varies x1–x3. */
  static readonly bonusPopingTime = 3000;
  /** Margin (fraction of arena) kept between a bonus and trails. */
  static readonly bonusPopingMargin = 0.01;

  game: unknown;
  bonuses = new Collection<ManagedBonus>([], 'id', true);

  constructor(game: unknown) {
    super();
    this.game = game;
    this.clear = this.clear.bind(this);
  }

  start(): void {
    this.clear();
  }

  stop(): void {
    this.clear();
  }

  add(bonus: ManagedBonus): boolean {
    return this.bonuses.add(bonus);
  }

  remove(bonus: ManagedBonus): boolean {
    bonus.clear();
    return this.bonuses.remove(bonus);
  }

  clear(): void {
    for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
      this.bonuses.items[i]!.clear();
    }
    this.bonuses.clear();
  }
}
