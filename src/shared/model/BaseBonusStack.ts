import { EventEmitter } from 'eventemitter3';
import { Collection } from '../Collection.ts';

/** A `[property, value]` pair a bonus contributes to its target's bonus stack. */
export type BonusEffect = [string, number];

/** What a stacked bonus must expose to the stack. */
export interface StackableBonus {
  id: number | null;
  getEffects(target: unknown): BonusEffect[];
}

/**
 * Merges the effects of every bonus currently active on a target and writes the
 * resulting values onto it. `resolve()` recomputes from scratch each time a bonus
 * is added or removed.
 */
export class BaseBonusStack<T = Record<string, number>> extends EventEmitter {
  target: T;
  bonuses = new Collection<StackableBonus>();

  constructor(target: T) {
    super();
    this.target = target;
  }

  add(bonus: StackableBonus): void {
    if (this.bonuses.add(bonus)) {
      this.resolve();
    }
  }

  remove(bonus: StackableBonus): void {
    if (this.bonuses.remove(bonus)) {
      this.resolve(bonus);
    }
  }

  clear(): void {
    this.bonuses.clear();
  }

  resolve(bonus?: StackableBonus): void {
    const properties: Record<string, number> = {};

    if (typeof bonus !== 'undefined') {
      const effects = bonus.getEffects(this.target);
      for (let i = effects.length - 1; i >= 0; i--) {
        const property = effects[i]![0];
        properties[property] = this.getDefaultProperty(property);
      }
    }

    for (let i = this.bonuses.items.length - 1; i >= 0; i--) {
      const effects = this.bonuses.items[i]!.getEffects(this.target);
      for (let j = effects.length - 1; j >= 0; j--) {
        const property = effects[j]![0];

        if (typeof properties[property] === 'undefined') {
          properties[property] = this.getDefaultProperty(property);
        }

        this.append(properties, property, effects[j]![1]);
      }
    }

    for (const property in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, property)) {
        this.apply(property, properties[property]!);
      }
    }
  }

  apply(property: string, value: number): void {
    (this.target as Record<string, unknown>)[property] = value;
  }

  getDefaultProperty(_property: string): number {
    return 0;
  }

  append(properties: Record<string, number>, property: string, value: number): void {
    properties[property] = (properties[property] ?? 0) + value;
  }
}
