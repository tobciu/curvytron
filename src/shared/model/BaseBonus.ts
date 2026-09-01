import type { BonusEffect } from './BaseBonusStack.ts';

/** Who a bonus affects. */
export type BonusAffect = 'self' | 'enemy' | 'leader' | 'game' | 'all';

/**
 * A map bonus. Concrete server bonuses set `duration` / `affect`, override the
 * `static probability` / `static getProbability`, and implement `getEffects`.
 *
 * NOTE: not an EventEmitter — the legacy `BaseBonus` extended one but then
 * shadowed `on`/`off` with lifecycle methods, so the emitter was unusable
 * anyway. Server bonuses never emit.
 */
export class BaseBonus {
  /** Default collision radius (also read statically by the BonusManager for spawn spacing). */
  static readonly radius = 3;
  /** Base spawn weight; concrete bonuses override or replace via `getProbability`. */
  static readonly probability: number = 1;

  x: number;
  y: number;
  id: number | null = null;

  affect: BonusAffect = 'self';
  radius = BaseBonus.radius;
  duration = 5000;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  clear(): void {}

  applyTo(_avatar: unknown, _game: unknown): void {}

  getEffects(_target: unknown): BonusEffect[] {
    return [];
  }

  /** Spawn weight for this bonus type given the current game state. Static — the
   *  BonusManager queries it per type, not per instance. */
  static getProbability(_game: unknown): number {
    return this.probability;
  }
}
